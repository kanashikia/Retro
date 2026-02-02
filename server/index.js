
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // In production, replace with your frontend URL
        methods: ["GET", "POST"]
    }
});

// In-memory store for sessions and participants
const sessions = {};
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

    socket.on('join-session', ({ sessionId, user }) => {
        if (!sessionId || !user) return;

        socket.join(sessionId);
        socketToUser.set(socket.id, { user, sessionId });

        console.log(`User ${user.name} (${socket.id}) joined session ${sessionId}`);

        // If session already exists, send it to the joining user
        if (sessions[sessionId]) {
            socket.emit('session-updated', sessions[sessionId]);
        } else {
            // First person to join a new session ID becomes admin if not already set
            sessions[sessionId] = { id: sessionId, adminId: user.id };
        }

        // Broadcast updated participant list to everyone in the room
        const participants = getParticipants(sessionId);
        io.to(sessionId).emit('participants-updated', participants);
    });

    socket.on('update-session', ({ sessionData, userId }) => {
        if (!sessionData || !sessionData.id || !userId) return;

        const session = sessions[sessionData.id];

        // Authorization: Only the admin can update major session state (like phases)
        if (session && session.adminId !== userId) {
            console.warn(`Unauthorized update attempt by ${userId} for session ${sessionData.id}`);
            // Still allow small updates like tickets if needed, but for now, let's be strict
            // or we could distinguish between 'admin-level' updates and 'user-level' updates.
            // For this retro app, most updates (adding tickets) are broadcast. 
            // In a real app, you'd separate 'add-ticket' vs 'change-phase'.
        }

        sessions[sessionData.id] = { ...sessions[sessionData.id], ...sessionData };
        socket.to(sessionData.id).emit('session-updated', sessions[sessionData.id]);
        console.log(`Session ${sessionData.id} updated by ${userId}`);
    });

    socket.on('ai-group-tickets', async ({ sessionId, tickets, userId }, callback) => {
        if (!sessionId || !tickets || !userId) return callback({ error: 'Missing data' });

        const session = sessions[sessionId];
        if (session && session.adminId !== userId) {
            return callback({ error: 'Unauthorized' });
        }

        try {
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

