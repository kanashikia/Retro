import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import cors from 'cors';
import { GoogleGenAI, Type } from "@google/genai";
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import { connectDB } from './db.js';
import Session from './models/Session.js';
import {
    buildVisibleSessionForUser,
    applyParticipantVotingUpdate,
    calculateFallbackAssignments,
    resolveAdminUserFromToken,
    sanitizeUser,
    signParticipantToken,
    verifyParticipantToken
} from './utils/sessionHelper.js';

dotenv.config();

// Connect to SQL Database
await connectDB();
import { startCleanupJob } from './services/cleanupService.js';
startCleanupJob();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin absolu vers la racine du projet et le dossier dist
const projectRoot = process.cwd();
const distPath = path.resolve(projectRoot, 'dist');

console.log('--- Server Startup ---');
console.log('Project Root:', projectRoot);
console.log('Dist Path:', distPath);

const app = express();
const rawCorsOrigins = (process.env.CORS_ORIGINS || '').trim();
const allowedOrigins = rawCorsOrigins
    ? rawCorsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
};

const makeRateLimiter = ({ windowMs, maxRequests }) => {
    const state = new Map();
    return (req, res, next) => {
        const now = Date.now();
        const key = `${req.ip}:${req.path}`;
        const entry = state.get(key) || { count: 0, resetAt: now + windowMs };

        if (now > entry.resetAt) {
            entry.count = 0;
            entry.resetAt = now + windowMs;
        }

        entry.count += 1;
        state.set(key, entry);

        if (entry.count > maxRequests) {
            return res.status(429).json({ message: 'Too many requests' });
        }
        return next();
    };
};

const authRateLimiter = makeRateLimiter({ windowMs: 60_000, maxRequests: 30 });

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});

// Health check (avant les routes pour être sûr)
app.get('/ping', (req, res) => res.send('pong'));
app.get('/favicon.ico', (req, res) => res.status(204).end());

import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/sessions', sessionRoutes);

// Serve static files from the Vite build directory
app.use(express.static(distPath));

// Catch-all route for SPA (Middleware style for Express 5 compatibility)
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    if (path.extname(req.path)) {
        return res.status(404).json({ error: 'Static asset not found' });
    }

    try {
        const indexPath = path.join(distPath, 'index.html');
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error('Error sending index.html:', err);
                res.status(500).send("Erreur lors du chargement de l'application. Vérifiez que le dossier 'dist' existe.");
            }
        });
    } catch (error) {
        console.error('Crash in catch-all route:', error);
        res.status(500).send("Crash serveur interne.");
    }
});

// Redis Setup
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error('Redis Pub Client Error', err));
subClient.on('error', (err) => console.error('Redis Sub Client Error', err));

try {
    await pubClient.connect();
    await subClient.connect();
    console.log('Connected to Redis');
} catch (err) {
    console.error('Failed to connect to Redis:', err.message);
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: corsOptions,
    adapter: createAdapter(pubClient, subClient),
    transports: ['polling', 'websocket'],
    perMessageDeflate: false,
    allowEIO3: true,
    pingInterval: 10000,
    pingTimeout: 5000
});

// In-memory store for transient state (local to this instance)
// socket.id -> { user, sessionId }
const socketToUser = new Map();
// Local tracking for efficient filtered broadcasting
const sessionToSockets = new Map();

// Redis-backed participant state (Global across all instances)
const getParticipants = async (sessionId) => {
    try {
        const userJsonList = await pubClient.hVals(`session:${sessionId}:participants`);
        return userJsonList.map(json => JSON.parse(json));
    } catch (error) {
        console.error('Error fetching participants from Redis:', error);
        return [];
    }
};

// Helper functions moved to server/utils/sessionHelper.js

const emitSessionUpdateForRoom = (sessionId, sessionData, status) => {
    // We iterate through LOCAL sockets in this session to send filtered views.
    // The Redis adapter handles the cross-node part if we were doing a plain broadcast,
    // but since we need per-user filtering, each node handles its own local clients.
    const socketIds = sessionToSockets.get(sessionId);
    if (!socketIds) return;

    for (const socketId of socketIds) {
        const data = socketToUser.get(socketId);
        if (!data) continue;
        io.to(socketId).emit('session-updated', buildVisibleSessionForUser(sessionData, data.user, status));
    }
};

// sanitizeUser and verifyAdminTokenForUser moved to sessionHelper.js

// applyParticipantVotingUpdate moved to sessionHelper.js

// AI Helper
const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
const hasUsableGeminiKey =
    !!geminiApiKey &&
    !/replace_with|your_|changeme|example|dummy/i.test(geminiApiKey);
let ai = null;

if (!hasUsableGeminiKey) {
    console.warn('[AI] Gemini disabled: GEMINI_API_KEY is missing or placeholder. AI grouping will be unavailable.');
} else {
    try {
        ai = new GoogleGenAI({ apiKey: geminiApiKey, apiVersion: 'v1' });
        console.log('[AI] Gemini initialized.');
    } catch (error) {
        console.error('[AI] Gemini initialization failed. AI grouping will be unavailable:', error.message);
    }
}

io.on('connection', (socket) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const ua = socket.handshake.headers['user-agent'];
    console.log(`User connected: ${socket.id} | IP: ${ip} | UA: ${ua}`);

    socket.on('join-session', async ({ sessionId: rawSessionId, user, token, participantToken }, callback) => {
        if (!rawSessionId || !user) return;
        const sessionId = rawSessionId.trim();
        const requestedUser = sanitizeUser(user);
        const adminUser = await resolveAdminUserFromToken(token, requestedUser.id);
        const verifiedParticipant = verifyParticipantToken(participantToken, sessionId);

        const safeUser = adminUser || verifiedParticipant || {
            ...sanitizeUser({
                id: `guest_${randomUUID()}`,
                name: requestedUser.name
            }),
            isAdmin: false
        };

        try {
            // Find session in DB or create it
            let session = await Session.findOne({ where: { sessionId } });

            if (session) {
                const sessionData = typeof session.data === 'string' ? JSON.parse(session.data) : session.data;
                const isAdminForSession = !!adminUser && String(sessionData?.adminId) === String(adminUser.id);
                const joinedUser = isAdminForSession ? adminUser : { ...safeUser, isAdmin: false };

                if (session.status === 'closed' && !isAdminForSession) {
                    if (typeof callback === 'function') {
                        callback({ error: 'Session is closed' });
                    }
                    return;
                }

                socket.join(sessionId);
                socketToUser.set(socket.id, { user: joinedUser, sessionId });

                if (!sessionToSockets.has(sessionId)) {
                    sessionToSockets.set(sessionId, new Set());
                }
                sessionToSockets.get(sessionId).add(socket.id);

                await pubClient.hSet(`session:${sessionId}:participants`, joinedUser.id, JSON.stringify(joinedUser));

                console.log(`User ${joinedUser.name} (${socket.id}) joined session room: "${sessionId}" | Global users in session: ${await pubClient.hLen(`session:${sessionId}:participants`)}`);

                socket.emit('session-updated', buildVisibleSessionForUser(sessionData, joinedUser, session.status));

                if (typeof callback === 'function') {
                    callback({
                        user: joinedUser,
                        participantToken: isAdminForSession ? null : signParticipantToken({ sessionId, user: joinedUser })
                    });
                }
            } else {
                // FALLBACK: Only create if the joining user is an actual admin
                // (This handles cases where the session wasn't pre-created for some reason)
                if (adminUser) {
                    const defaultData = {
                        id: sessionId,
                        phase: 'BRAINSTORM',
                        tickets: [],
                        themes: [],
                        currentThemeIndex: 0,
                        adminId: adminUser.id,
                        brainstormTimerDuration: 10,
                        brainstormTimerEndsAt: null,
                        defaultThemeId: 'light'
                    };
                    const newSession = await Session.create({
                        sessionId,
                        adminId: adminUser.id,
                        data: defaultData
                    });
                    session = newSession;
                    const joinedUser = { ...adminUser, isAdmin: true };

                    socket.join(sessionId);
                    socketToUser.set(socket.id, { user: joinedUser, sessionId });

                    if (!sessionToSockets.has(sessionId)) {
                        sessionToSockets.set(sessionId, new Set());
                    }
                    sessionToSockets.get(sessionId).add(socket.id);

                    await pubClient.hSet(`session:${sessionId}:participants`, joinedUser.id, JSON.stringify(joinedUser));

                    console.log(`User ${joinedUser.name} (${socket.id}) joined session room: "${sessionId}" | Global users in session: ${await pubClient.hLen(`session:${sessionId}:participants`)}`);

                    socket.emit('session-updated', buildVisibleSessionForUser(defaultData, joinedUser));
                    if (typeof callback === 'function') {
                        callback({ user: joinedUser, participantToken: null });
                    }
                } else {
                    console.log(`Unauthorized visitor ${safeUser.name} tried to join non-existent session ${sessionId}`);
                    if (typeof callback === 'function') {
                        callback({ error: 'Unauthorized' });
                    }
                    return;
                }
            }

            // Broadcast updated participant list to everyone in the room
            const participants = await getParticipants(sessionId);
            io.to(sessionId).emit('participants-updated', participants);
        } catch (error) {
            console.error('Error in join-session:', error);
        }
    });

    socket.on('close-session', async ({ sessionId: rawSessionId }, callback) => {
        const actor = socketToUser.get(socket.id)?.user;
        if (!rawSessionId || !actor?.id) return;
        const sessionId = rawSessionId.trim();

        try {
            const session = await Session.findOne({ where: { sessionId } });

            if (session && actor.isAdmin && String(session.adminId) === String(actor.id)) {
                await Session.update({ status: 'closed' }, { where: { sessionId } });
                io.to(sessionId).emit('session-closed');
                console.log(`Session ${sessionId} closed by admin ${actor.id}`);
                if (typeof callback === 'function') callback({ success: true });
            } else {
                if (typeof callback === 'function') callback({ error: 'Unauthorized or session not found' });
            }
        } catch (error) {
            console.error('Error in close-session:', error);
            if (typeof callback === 'function') callback({ error: error.message });
        }
    });

    socket.on('update-session', async ({ sessionData }) => {
        const actor = socketToUser.get(socket.id)?.user;
        if (!sessionData || !sessionData.id || !actor?.id) {
            console.error('Update-session rejected: Missing data', { sessionDataId: sessionData?.id, actorId: actor?.id });
            return;
        }

        const sessionId = sessionData.id.trim();

        try {
            console.log(`Processing update-session for ${sessionId} from user ${actor.id}`);
            const session = await Session.findOne({ where: { sessionId: sessionId } });
            if (!session) {
                console.warn(`Update-session rejected: session ${sessionId} not found`);
                return;
            }

            // Allow updates from participants if they are in the session
            const participants = await getParticipants(sessionId);
            const isParticipant = participants.some(p => String(p.id) === String(actor.id));
            const isAdmin = !!(session && actor.isAdmin && String(session.adminId) === String(actor.id));

            if (session && !isAdmin && !isParticipant) {
                console.warn(`Unauthorized update attempt by ${actor.id} for session ${sessionId}. Participants:`, participants.map(p => p.id));
                return;
            }

            // Ensure we are merging properly
            const existingData = session ? (typeof session.data === 'string' ? JSON.parse(session.data) : session.data) : {};
            const updatedData = { ...existingData, ...sessionData, id: sessionId };

            if (!isAdmin) {
                updatedData.adminId = existingData?.adminId;
                updatedData.phase = existingData?.phase;
                updatedData.currentThemeIndex = existingData?.currentThemeIndex;
                updatedData.brainstormTimerEndsAt = existingData?.brainstormTimerEndsAt;
                updatedData.brainstormTimerDuration = existingData?.brainstormTimerDuration;
                updatedData.defaultThemeId = existingData?.defaultThemeId;
            } else if (sessionData.phase && sessionData.phase !== existingData?.phase) {
                // Reset ready status for everyone when admin changes phase
                for (const [sid, data] of socketToUser.entries()) {
                    if (data.sessionId === sessionId) {
                        data.user.isReady = false;
                        socketToUser.set(sid, data);
                    }
                }
            }

            // In brainstorm, non-admin clients receive a filtered ticket view.
            // Prevent them from overwriting others' tickets when they submit updates.
            if (!isAdmin && existingData?.phase === 'BRAINSTORM') {
                const existingTickets = Array.isArray(existingData?.tickets) ? existingData.tickets : [];
                const incomingTickets = Array.isArray(sessionData?.tickets) ? sessionData.tickets : [];

                const userOwnedFromIncoming = incomingTickets.filter(
                    (ticket) => ticket && String(ticket.authorId) === String(actor.id)
                );
                const othersFromExisting = existingTickets.filter(
                    (ticket) => !ticket || String(ticket.authorId) !== String(actor.id)
                );

                updatedData.tickets = [...othersFromExisting, ...userOwnedFromIncoming];
                updatedData.themes = existingData?.themes || [];
            }

            if (!isAdmin && existingData?.phase === 'VOTING') {
                const votingSafe = applyParticipantVotingUpdate(existingData, sessionData, actor.id);
                updatedData.themes = votingSafe.themes;
                updatedData.tickets = existingData?.tickets || [];
            }

            if (!isAdmin && existingData?.phase === 'DISCUSSION') {
                updatedData.tickets = existingData?.tickets || [];
                updatedData.themes = existingData?.themes || [];
            }

            await Session.upsert({
                sessionId: sessionId,
                adminId: session.adminId,
                data: updatedData
            });

            // Broadcast a filtered view to each participant.
            emitSessionUpdateForRoom(sessionId, updatedData, session.status);
            console.log(`Session ${sessionId} updated and broadcasted with per-user visibility. New theme count: ${updatedData.themes?.length || 0}`);
        } catch (error) {
            console.error('Error in update-session:', error);
        }
    });

    socket.on('toggle-reaction', async ({ sessionId, ticketId, emoji }) => {
        const actor = socketToUser.get(socket.id)?.user;
        const actorSessionId = socketToUser.get(socket.id)?.sessionId;
        if (!sessionId || !ticketId || !emoji || !actor?.id || actorSessionId !== sessionId) return;

        try {
            const session = await Session.findOne({ where: { sessionId } });
            if (!session) return;

            const sessionData = typeof session.data === 'string' ? JSON.parse(session.data) : session.data;
            if (sessionData.phase === 'BRAINSTORM') return;

            const tickets = Array.isArray(sessionData.tickets) ? sessionData.tickets : [];
            const ticketIndex = tickets.findIndex(t => t.id === ticketId);

            if (ticketIndex === -1) return;

            const ticket = tickets[ticketIndex];
            const reactions = ticket.reactions || {};
            const userIds = reactions[emoji] || [];

            if (userIds.includes(actor.id)) {
                reactions[emoji] = userIds.filter(id => id !== actor.id);
                if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
                reactions[emoji] = [...userIds, actor.id];
            }

            ticket.reactions = reactions;
            tickets[ticketIndex] = ticket;
            sessionData.tickets = tickets;

            await Session.update({ data: sessionData }, { where: { sessionId } });
            emitSessionUpdateForRoom(sessionId, sessionData);
        } catch (error) {
            console.error('Error in toggle-reaction:', error);
        }
    });

    socket.on('ai-group-tickets', async ({ sessionId, tickets }, callback) => {
        const actor = socketToUser.get(socket.id)?.user;
        if (!sessionId || !tickets || !actor?.id) return callback({ error: 'Missing data' });
        if (!ai) {
            return callback({
                error: 'AI grouping unavailable: set a valid GEMINI_API_KEY in server environment (not a placeholder).'
            });
        }

        try {
            const session = await Session.findOne({ where: { sessionId } });
            if (!session) {
                return callback({ error: 'Session not found' });
            }
            if (session && (!actor.isAdmin || String(session.adminId) !== String(actor.id))) {
                return callback({ error: 'Unauthorized' });
            }
            const ticketAliasData = tickets.map((t, index) => ({
                alias: `T${index + 1}`,
                id: t.id,
                text: t.text,
                column: t.column
            }));

            // Prepare a lightweight version for the prompt to reduce token noise
            const promptItems = ticketAliasData.map(t => ({ alias: t.alias, text: t.text, column: t.column }));

            // Dynamic max themes: scales with ticket count
            const maxThemes = Math.min(15, Math.max(3, Math.round(Math.sqrt(tickets.length) * 1.3)));

            const prompt = `
You are an expert at analyzing agile retrospective feedback cards and clustering them into meaningful, actionable themes.

CONTEXT:
These cards come from a team retrospective. Each card has:
- "alias": a short ID like T1, T2
- "text": the feedback written by a team member
- "column": the column it was placed in (e.g. "What went well", "What went less well", "What do we want to try next", "What puzzles us")

The column tells you the SENTIMENT behind the card.

RULES:
1. Group cards into SPECIFIC, CONCRETE themes.
2. DISPERSE tickets: If you see distinct topics (e.g. "Animals" vs "Vehicles"), they MUST be in different themes. Never group everything together if topics differ.
3. Themes must have a "name" (short/specific), "description", and a unique "id".
4. Assignments: Use the "alias" (T1, T2...) for "ticketId" and your theme's "id" for "themeId".
5. Return ONLY valid JSON.

Items (${tickets.length} cards):
${JSON.stringify(promptItems)}
`;

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: prompt }] }],
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

            const rawText = result?.text ?? result?.response?.text?.();
            if (!rawText) {
                console.error('[AI] Empty response from Gemini.');
                return callback({ error: 'AI Error: Empty response from Gemini.' });
            }

            console.log('[AI] Raw Response Length:', rawText.length);

            const normalizeJsonText = (text) => {
                const trimmed = String(text).trim();
                const withoutFence = trimmed
                    .replace(/^```json\s*/i, '')
                    .replace(/^```\s*/i, '')
                    .replace(/\s*```$/i, '')
                    .trim();

                if (withoutFence.startsWith('{') || withoutFence.startsWith('[')) {
                    return withoutFence;
                }

                const firstBrace = withoutFence.indexOf('{');
                const lastBrace = withoutFence.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    return withoutFence.slice(firstBrace, lastBrace + 1);
                }

                return withoutFence;
            };

            let parsedJson;
            try {
                parsedJson = JSON.parse(normalizeJsonText(rawText));
            } catch (e) {
                console.error('[AI] JSON Parse Error:', e.message, 'Raw Text snippet:', rawText.slice(0, 200));
                return callback({ error: 'AI Error: Invalid JSON response.' });
            }

            const rawThemes = Array.isArray(parsedJson?.themes) ? parsedJson.themes : [];
            const rawAssignments = Array.isArray(parsedJson?.assignments) ? parsedJson.assignments : [];

            const normalizedThemes = rawThemes.map((theme, index) => ({
                id: `theme_${index + 1}`,
                name: String(theme?.name ?? `Theme ${index + 1}`),
                description: String(theme?.description ?? '')
            }));

            const normalizeKey = (value) => String(value ?? '').trim().toLowerCase();
            const aliasToRealTicketId = new Map(ticketAliasData.map((t) => [t.alias, t.id]));
            const realTicketIds = new Set(ticketAliasData.map((t) => t.id));

            const rawThemeToCanonical = new Map();
            rawThemes.forEach((theme, index) => {
                const canonicalId = `theme_${index + 1}`;
                const rawId = String(theme?.id ?? '');
                const rawName = String(theme?.name ?? '');

                // Map every possible format the AI might use for this theme
                rawThemeToCanonical.set(rawId, canonicalId);
                rawThemeToCanonical.set(normalizeKey(rawId), canonicalId);
                rawThemeToCanonical.set(normalizeKey(rawName), canonicalId);
                rawThemeToCanonical.set(String(index + 1), canonicalId);
                rawThemeToCanonical.set(`theme${index + 1}`, canonicalId);
                rawThemeToCanonical.set(`theme_${index + 1}`, canonicalId);
                rawThemeToCanonical.set(`t${index + 1}`, canonicalId);
                rawThemeToCanonical.set(`group${index + 1}`, canonicalId);
                rawThemeToCanonical.set(`group_${index + 1}`, canonicalId);
            });

            const normalizeTicketId = (rawTicketId) => {
                const ticketKey = String(rawTicketId ?? '').trim();
                if (!ticketKey) return null;

                // Direct match with alias or real ID
                if (aliasToRealTicketId.has(ticketKey)) return aliasToRealTicketId.get(ticketKey);
                if (realTicketIds.has(ticketKey)) return ticketKey;

                // Case-insensitive alias match (T1, t1, T-1, etc)
                const normalizedKey = ticketKey.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (aliasToRealTicketId.has(normalizedKey)) return aliasToRealTicketId.get(normalizedKey);

                // Index-based extraction (looks for the numeric part in "T1", "Ticket 1", "1", etc)
                const indexMatch = ticketKey.match(/(\d+)/);
                if (indexMatch) {
                    const idx = Number(indexMatch[1]) - 1;
                    if (idx >= 0 && idx < ticketAliasData.length) {
                        return ticketAliasData[idx].id;
                    }
                }
                return null;
            };

            const resolveThemeId = (rawThemeId) => {
                const raw = String(rawThemeId ?? '').trim();
                if (!raw) return null;
                // Try exact match first, then normalized
                return rawThemeToCanonical.get(raw)
                    || rawThemeToCanonical.get(normalizeKey(raw))
                    || null;
            };

            const normalizedAssignments = [];
            let unmatchedThemeIds = [];
            rawAssignments.forEach((assignment) => {
                const ticketId = normalizeTicketId(assignment?.ticketId);
                const themeId = resolveThemeId(assignment?.themeId);
                if (ticketId && themeId) {
                    normalizedAssignments.push({ ticketId, themeId });
                } else {
                    if (ticketId && !themeId) unmatchedThemeIds.push(String(assignment?.themeId));
                    console.log(`[AI] Assignment Drop: ticketIdMatch=${!!ticketId}, themeIdMatch=${!!themeId}, rawTicketId=${assignment?.ticketId}, rawThemeId=${assignment?.themeId}`);
                }
            });

            if (unmatchedThemeIds.length > 0) {
                console.warn(`[AI] ${unmatchedThemeIds.length} assignments had unresolvable themeIds:`, [...new Set(unmatchedThemeIds)].slice(0, 5));
            }

            const assignedTicketIds = new Set(normalizedAssignments.map((a) => a.ticketId));
            const needsHeuristicFallback =
                normalizedThemes.length > 1 && assignedTicketIds.size < ticketAliasData.length;

            console.log(`[AI] Grouping Stats: Themes=${normalizedThemes.length}, Assignments=${normalizedAssignments.length}/${ticketAliasData.length}, HeuristicFallback=${needsHeuristicFallback}`);

            if (needsHeuristicFallback) {
                const fallbackAssignments = calculateFallbackAssignments(ticketAliasData, normalizedThemes, assignedTicketIds);
                normalizedAssignments.push(...fallbackAssignments);
            }

            callback({
                success: true,
                data: {
                    themes: normalizedThemes,
                    assignments: normalizedAssignments
                }
            });
        } catch (error) {
            console.error("AI Grouping failed. Full error details:", error);
            const message = String(error?.message || '');
            if (/api key|unauth|auth|401|403|invalid/i.test(message)) {
                return callback({
                    error: 'AI grouping unavailable: Gemini API key is not recognized by Google. Message: ' + message
                });
            }
            if (/fetch failed|ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT/i.test(message)) {
                return callback({
                    error: 'AI grouping unavailable: network access from server to Gemini API failed.'
                });
            }
            callback({ error: 'AI Error: ' + message });
        }
    });

    socket.on('toggle-ready', async ({ sessionId, isReady }) => {
        const userData = socketToUser.get(socket.id);
        if (!userData || userData.sessionId !== sessionId) return;

        userData.user.isReady = !!isReady;
        socketToUser.set(socket.id, userData);

        // update global state in Redis
        await pubClient.hSet(`session:${sessionId}:participants`, userData.user.id, JSON.stringify(userData.user));

        console.log(`User ${userData.user.name} toggled ready: ${userData.user.isReady}`);

        // Broadcast updated participant list
        const participants = await getParticipants(sessionId);
        io.to(sessionId).emit('participants-updated', participants);
    });

    socket.on('disconnect', async () => {

        const userData = socketToUser.get(socket.id);
        if (userData) {
            const { sessionId } = userData;
            socketToUser.delete(socket.id);

            // cleanup local session socket tracking
            const sIds = sessionToSockets.get(sessionId);
            if (sIds) {
                sIds.delete(socket.id);
                if (sIds.size === 0) sessionToSockets.delete(sessionId);
            }

            // cleanup global session state in Redis
            await pubClient.hDel(`session:${sessionId}:participants`, userData.user.id);

            console.log(`User disconnected: ${socket.id} (from ${sessionId}) | Users remaining locally: ${socketToUser.size}`);

            // Broadcast updated participant list
            const participants = await getParticipants(sessionId);
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
