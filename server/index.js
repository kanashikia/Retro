import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from 'dotenv';
import { connectDB } from './db.js';
import Session from './models/Session.js';

dotenv.config();

// Connect to SQL Database
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // In production, replace with your frontend URL
        methods: ["GET", "POST"]
    }
});

// In-memory store for transient state (participants online)
const socketToUser = new Map(); // socket.id -> { user, sessionId }

const getParticipants = (sessionId) => {
    const participants = [];
    const seenUserIds = new Set();

    for (const [id, data] of socketToUser.entries()) {
        if (data.sessionId === sessionId && !seenUserIds.has(data.user.id)) {
            participants.push(data.user);
            seenUserIds.add(data.user.id);
        }
    }
    return participants;
};

// AI Helper
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-session', async ({ sessionId: rawSessionId, user }) => {
        if (!rawSessionId || !user) return;
        const sessionId = rawSessionId.trim();

        socket.join(sessionId);
        socketToUser.set(socket.id, { user, sessionId });

        console.log(`User ${user.name} (${socket.id}) joined session room: "${sessionId}"`);

        try {
            // Find session in DB or create it
            let session = await Session.findOne({ where: { sessionId } });

            if (session) {
                socket.emit('session-updated', session.data);
            } else {
                // FALLBACK: Only create if the joining user is an actual admin
                // (This handles cases where the session wasn't pre-created for some reason)
                if (user.isAdmin) {
                    const defaultData = {
                        id: sessionId,
                        phase: 'BRAINSTORM',
                        tickets: [],
                        themes: [],
                        currentThemeIndex: 0,
                        adminId: user.id
                    };
                    const newSession = await Session.create({
                        sessionId,
                        adminId: user.id,
                        data: defaultData
                    });
                    session = newSession;
                    socket.emit('session-updated', defaultData);
                } else {
                    console.log(`Unauthorized visitor ${user.name} tried to join non-existent session ${sessionId}`);
                    // Potentially emit an error or handle redirection
                    return;
                }
            }

            // Broadcast updated participant list to everyone in the room
            const participants = getParticipants(sessionId);
            io.to(sessionId).emit('participants-updated', participants);
        } catch (error) {
            console.error('Error in join-session:', error);
        }
    });

    socket.on('close-session', async ({ sessionId: rawSessionId, userId }, callback) => {
        if (!rawSessionId || !userId) return;
        const sessionId = rawSessionId.trim();

        try {
            const session = await Session.findOne({ where: { sessionId } });

            if (session && String(session.adminId) === String(userId)) {
                await Session.update({ status: 'closed' }, { where: { sessionId } });
                io.to(sessionId).emit('session-closed');
                console.log(`Session ${sessionId} closed by admin ${userId}`);
                if (typeof callback === 'function') callback({ success: true });
            } else {
                if (typeof callback === 'function') callback({ error: 'Unauthorized or session not found' });
            }
        } catch (error) {
            console.error('Error in close-session:', error);
            if (typeof callback === 'function') callback({ error: error.message });
        }
    });

    socket.on('update-session', async ({ sessionData, userId }) => {
        if (!sessionData || !sessionData.id || !userId) {
            console.error('Update-session rejected: Missing data', { sessionDataId: sessionData?.id, userId });
            return;
        }

        const sessionId = sessionData.id.trim();

        try {
            console.log(`Processing update-session for ${sessionId} from user ${userId}`);
            const session = await Session.findOne({ where: { sessionId: sessionId } });

            // Allow updates from participants if they are in the session
            const participants = getParticipants(sessionId);
            const isParticipant = participants.some(p => String(p.id) === String(userId));
            const isAdmin = session && String(session.adminId) === String(userId);

            if (session && !isAdmin && !isParticipant) {
                console.warn(`Unauthorized update attempt by ${userId} for session ${sessionId}. Participants:`, participants.map(p => p.id));
                return;
            }

            // Ensure we are merging properly
            const existingData = session ? (typeof session.data === 'string' ? JSON.parse(session.data) : session.data) : {};
            const updatedData = { ...existingData, ...sessionData, id: sessionId };

            await Session.upsert({
                sessionId: sessionId,
                adminId: (session ? session.adminId : userId),
                data: updatedData
            });

            // Broadcast to everyone in the room (including sender to confirm processing)
            io.to(sessionId).emit('session-updated', updatedData);
            console.log(`Session ${sessionId} updated and broadcasted via io.to(). New theme count: ${updatedData.themes?.length || 0}`);
        } catch (error) {
            console.error('Error in update-session:', error);
        }
    });

    socket.on('ai-group-tickets', async ({ sessionId, tickets, userId }, callback) => {
        if (!sessionId || !tickets || !userId) return callback({ error: 'Missing data' });

        try {
            const session = await Session.findOne({ where: { sessionId } });
            if (session && String(session.adminId) !== String(userId)) {
                return callback({ error: 'Unauthorized' });
            }

            const ticketData = tickets.map(t => ({ id: t.id, text: t.text, originalContext: t.column }));
            const prompt = `Act as an expert Agile Coach. Organize team feedback into 3-6 semantic themes. Assign every ticket ID to exactly one theme ID. Return JSON. Items: ${JSON.stringify(ticketData)}`;

            const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
            const response = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            themes: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.STRING },
                                        name: { type: Type.STRING },
                                        description: { type: Type.STRING }
                                    },
                                    required: ["id", "name", "description"]
                                }
                            },
                            assignments: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        ticketId: { type: Type.STRING },
                                        themeId: { type: Type.STRING }
                                    },
                                    required: ["ticketId", "themeId"]
                                }
                            }
                        },
                        required: ["themes", "assignments"]
                    }
                }
            });

            const result = JSON.parse(response.response.text());
            callback({ success: true, data: result });
        } catch (error) {
            console.error("AI Grouping failed:", error);
            callback({ error: 'AI Error: ' + error.message });
        }
    });

    socket.on('disconnect', () => {
        const userData = socketToUser.get(socket.id);
        if (userData) {
            const { sessionId } = userData;
            socketToUser.delete(socket.id);

            console.log(`User disconnected: ${socket.id} (from ${sessionId})`);

            // Broadcast updated participant list
            const participants = getParticipants(sessionId);
            io.to(sessionId).emit('participants-updated', participants);
        } else {
            console.log('User disconnected:', socket.id);
        }
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Sync server running on port ${PORT}`);
});
