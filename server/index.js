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
app.use('/api/auth', authRoutes);

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

    socket.on('join-session', async ({ sessionId, user }) => {
        if (!sessionId || !user) return;

        socket.join(sessionId);
        socketToUser.set(socket.id, { user, sessionId });

        console.log(`User ${user.name} (${socket.id}) joined session ${sessionId}`);

        try {
            // Find session in DB or create it
            let session = await Session.findOne({ where: { sessionId } });

            if (session) {
                socket.emit('session-updated', session.data);
            } else {
                // First person to join a new session ID becomes admin
                const newSession = await Session.create({
                    sessionId,
                    adminId: user.id,
                    data: { id: sessionId, adminId: user.id }
                });
                session = newSession;
            }

            // Broadcast updated participant list to everyone in the room
            const participants = getParticipants(sessionId);
            io.to(sessionId).emit('participants-updated', participants);
        } catch (error) {
            console.error('Error in join-session:', error);
        }
    });

    socket.on('update-session', async ({ sessionData, userId }) => {
        if (!sessionData || !sessionData.id || !userId) return;

        try {
            const session = await Session.findOne({ where: { sessionId: sessionData.id } });

            if (session && session.adminId !== userId) {
                console.warn(`Unauthorized update attempt by ${userId} for session ${sessionData.id}`);
            }

            const updatedData = { ...(session ? session.data : {}), ...sessionData };

            await Session.upsert({
                sessionId: sessionData.id,
                adminId: (session ? session.adminId : userId),
                data: updatedData
            });

            socket.to(sessionData.id).emit('session-updated', updatedData);
            console.log(`Session ${sessionData.id} updated by ${userId}`);
        } catch (error) {
            console.error('Error in update-session:', error);
        }
    });

    socket.on('ai-group-tickets', async ({ sessionId, tickets, userId }, callback) => {
        if (!sessionId || !tickets || !userId) return callback({ error: 'Missing data' });

        try {
            const session = await Session.findOne({ where: { sessionId } });
            if (session && session.adminId !== userId) {
                return callback({ error: 'Unauthorized' });
            }

            const ticketData = tickets.map(t => ({ id: t.id, text: t.text, originalContext: t.column }));
            const prompt = `Act as an expert Agile Coach. Organize team feedback into 3-6 semantic themes. Assign every ticket ID to exactly one theme ID. Return JSON. Items: ${JSON.stringify(ticketData)}`;

            const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
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
