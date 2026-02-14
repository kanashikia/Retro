import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GoogleGenAI, Type } from "@google/genai";
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { connectDB } from './db.js';
import Session from './models/Session.js';

dotenv.config();

// Connect to SQL Database
connectDB();

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

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: corsOptions,
    transports: ['polling', 'websocket'],
    perMessageDeflate: false,
    allowEIO3: true,
    pingInterval: 10000,
    pingTimeout: 5000
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

const isBrainstormPhase = (sessionData) => sessionData?.phase === 'BRAINSTORM';

const isSessionAdmin = (sessionData, user) =>
    !!user?.isAdmin || String(sessionData?.adminId) === String(user?.id);

const getVisibleTicketsForUser = (sessionData, user) => {
    const tickets = Array.isArray(sessionData?.tickets) ? sessionData.tickets : [];

    if (!isBrainstormPhase(sessionData) || isSessionAdmin(sessionData, user)) {
        return tickets;
    }

    return tickets.filter((ticket) => {
        if (!ticket) return false;
        if (!ticket.authorId) return false;
        return String(ticket.authorId) === String(user?.id);
    });
};

const buildVisibleSessionForUser = (sessionData, user) => ({
    ...sessionData,
    tickets: getVisibleTicketsForUser(sessionData, user)
});

const emitSessionUpdateForRoom = (sessionId, sessionData) => {
    for (const [socketId, data] of socketToUser.entries()) {
        if (data.sessionId !== sessionId) continue;
        io.to(socketId).emit('session-updated', buildVisibleSessionForUser(sessionData, data.user));
    }
};

const sanitizeUser = (user) => {
    const id = String(user?.id || '').trim();
    const name = String(user?.name || '').trim().slice(0, 64);
    return {
        id,
        name: name || 'Anonymous',
        isAdmin: false,
        isReady: !!user?.isReady
    };
};

const verifyAdminTokenForUser = (token, userId) => {
    if (!token || !userId) return false;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return String(decoded?.id) === String(userId);
    } catch {
        return false;
    }
};

const applyParticipantVotingUpdate = (existingData, incomingData, actorId) => {
    const existingThemes = Array.isArray(existingData?.themes) ? existingData.themes : [];
    const incomingThemes = Array.isArray(incomingData?.themes) ? incomingData.themes : [];
    const maxVotesPerUser = Number(process.env.MAX_VOTES_PER_USER || 5);
    const actorVotesUsed = existingThemes.reduce((acc, theme) => {
        const voterIds = Array.isArray(theme?.voterIds) ? theme.voterIds : [];
        return acc + voterIds.filter((id) => String(id) === String(actorId)).length;
    }, 0);

    if (actorVotesUsed >= maxVotesPerUser) {
        return { ...existingData };
    }

    const incomingById = new Map(incomingThemes.map((theme) => [theme?.id, theme]));
    let voteApplied = false;

    const themes = existingThemes.map((theme) => {
        const source = incomingById.get(theme.id);
        const existingVoterIds = Array.isArray(theme.voterIds) ? theme.voterIds : [];
        const incomingVoterIds = Array.isArray(source?.voterIds) ? source.voterIds : [];

        const existingActorVotes = existingVoterIds.filter((id) => String(id) === String(actorId)).length;
        const incomingActorVotes = incomingVoterIds.filter((id) => String(id) === String(actorId)).length;
        const wantsAnotherVote = incomingActorVotes > existingActorVotes;

        if (!voteApplied && wantsAnotherVote) {
            voteApplied = true;
            return {
                ...theme,
                votes: Number(theme.votes || 0) + 1,
                voterIds: [...existingVoterIds, actorId]
            };
        }

        return theme;
    });

    return {
        ...existingData,
        themes
    };
};

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
        ai = new GoogleGenAI({ apiKey: geminiApiKey });
        console.log('[AI] Gemini initialized.');
    } catch (error) {
        console.error('[AI] Gemini initialization failed. AI grouping will be unavailable:', error.message);
    }
}

io.on('connection', (socket) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const ua = socket.handshake.headers['user-agent'];
    console.log(`User connected: ${socket.id} | IP: ${ip} | UA: ${ua}`);

    socket.on('join-session', async ({ sessionId: rawSessionId, user, token }) => {
        if (!rawSessionId || !user) return;
        const sessionId = rawSessionId.trim();
        const safeUser = sanitizeUser(user);
        if (!safeUser.id) return;

        socket.join(sessionId);
        socketToUser.set(socket.id, { user: safeUser, sessionId });

        console.log(`User ${safeUser.name} (${socket.id}) joined session room: "${sessionId}"`);

        try {
            // Find session in DB or create it
            let session = await Session.findOne({ where: { sessionId } });

            if (session) {
                const sessionData = typeof session.data === 'string' ? JSON.parse(session.data) : session.data;
                const isAdminForSession =
                    verifyAdminTokenForUser(token, safeUser.id) &&
                    String(sessionData?.adminId) === String(safeUser.id);

                const joinedUser = { ...safeUser, isAdmin: isAdminForSession };
                socketToUser.set(socket.id, { user: joinedUser, sessionId });
                socket.emit('session-updated', buildVisibleSessionForUser(sessionData, joinedUser));
            } else {
                // FALLBACK: Only create if the joining user is an actual admin
                // (This handles cases where the session wasn't pre-created for some reason)
                if (verifyAdminTokenForUser(token, safeUser.id)) {
                    const defaultData = {
                        id: sessionId,
                        phase: 'BRAINSTORM',
                        tickets: [],
                        themes: [],
                        currentThemeIndex: 0,
                        adminId: safeUser.id,
                        brainstormTimerDuration: 10,
                        brainstormTimerEndsAt: null,
                        defaultThemeId: 'light'
                    };
                    const newSession = await Session.create({
                        sessionId,
                        adminId: safeUser.id,
                        data: defaultData
                    });
                    session = newSession;
                    const joinedUser = { ...safeUser, isAdmin: true };
                    socketToUser.set(socket.id, { user: joinedUser, sessionId });
                    socket.emit('session-updated', buildVisibleSessionForUser(defaultData, joinedUser));
                } else {
                    console.log(`Unauthorized visitor ${safeUser.name} tried to join non-existent session ${sessionId}`);
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

            // Allow updates from participants if they are in the session
            const participants = getParticipants(sessionId);
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
                adminId: (session ? session.adminId : actor.id),
                data: updatedData
            });

            // Broadcast a filtered view to each participant.
            emitSessionUpdateForRoom(sessionId, updatedData);
            console.log(`Session ${sessionId} updated and broadcasted with per-user visibility. New theme count: ${updatedData.themes?.length || 0}`);
        } catch (error) {
            console.error('Error in update-session:', error);
        }
    });

    socket.on('toggle-reaction', async ({ sessionId, ticketId, emoji }) => {
        const actor = socketToUser.get(socket.id)?.user;
        if (!sessionId || !ticketId || !emoji || !actor?.id) return;

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
            if (session && (!actor.isAdmin || String(session.adminId) !== String(actor.id))) {
                return callback({ error: 'Unauthorized' });
            }

            const ticketAliasData = tickets.map((t, index) => ({
                alias: `T${index + 1}`,
                id: t.id,
                text: t.text,
                originalContext: t.column
            }));
            const prompt = `
You are grouping retrospective cards into concrete, content-based themes.

Rules:
- Use the ACTUAL card content first (keywords/entities/nouns), not generic agile coaching buckets.
- Prefer literal cluster names users would expect from their words.
- Do NOT use abstract categories like "Challenges", "Opportunities", "Understanding", "Communication", "Process" unless cards explicitly contain those ideas.
- If cards are sparse or simple, create direct themes (example: cards "herisson", "grenouille" => theme like "Animaux" or specific animal subgroups).
- Create 1 to 6 themes depending on data (not forced to 3+).
- Assign every ticketId to exactly one themeId.
- For assignments.ticketId, you MUST use the provided ticket aliases only (T1, T2, ...), not UUIDs.
- Theme names must be short and specific (2-5 words max).
- Return ONLY valid JSON matching the schema.

Items:
${JSON.stringify(ticketAliasData)}
`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
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

            const rawText = response?.text ?? response?.response?.text?.();
            if (!rawText) {
                return callback({ error: 'AI Error: Empty response from Gemini.' });
            }

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

            const result = JSON.parse(normalizeJsonText(rawText));

            const rawThemes = Array.isArray(result?.themes) ? result.themes : [];
            const rawAssignments = Array.isArray(result?.assignments) ? result.assignments : [];

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
                rawThemeToCanonical.set(normalizeKey(theme?.id), canonicalId);
                rawThemeToCanonical.set(normalizeKey(theme?.name), canonicalId);
            });

            const normalizeTicketId = (rawTicketId) => {
                const ticketKey = String(rawTicketId ?? '').trim();
                if (!ticketKey) return null;
                if (aliasToRealTicketId.has(ticketKey)) return aliasToRealTicketId.get(ticketKey);
                if (realTicketIds.has(ticketKey)) return ticketKey;

                const indexMatch = ticketKey.match(/^t?(\d+)$/i);
                if (indexMatch) {
                    const idx = Number(indexMatch[1]) - 1;
                    if (idx >= 0 && idx < ticketAliasData.length) {
                        return ticketAliasData[idx].id;
                    }
                }
                return null;
            };

            const normalizedAssignments = [];
            rawAssignments.forEach((assignment) => {
                const ticketId = normalizeTicketId(assignment?.ticketId);
                const themeId = rawThemeToCanonical.get(normalizeKey(assignment?.themeId));
                if (ticketId && themeId) {
                    normalizedAssignments.push({ ticketId, themeId });
                }
            });

            const assignedTicketIds = new Set(normalizedAssignments.map((a) => a.ticketId));
            const needsHeuristicFallback =
                normalizedThemes.length > 1 && assignedTicketIds.size < ticketAliasData.length;

            if (needsHeuristicFallback) {
                const tokenize = (value) =>
                    String(value || '')
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9\s]/g, ' ')
                        .split(/\s+/)
                        .filter(Boolean);

                const stopWords = new Set([
                    'the', 'a', 'an', 'and', 'or', 'to', 'of', 'for', 'in', 'on',
                    'de', 'du', 'des', 'la', 'le', 'les', 'et', 'ou', 'un', 'une',
                    'what', 'went', 'well', 'next', 'try', 'version'
                ]);

                const themeLexicon = normalizedThemes.map((theme) => {
                    const words = new Set(
                        [...tokenize(theme.name), ...tokenize(theme.description)].filter((w) => !stopWords.has(w))
                    );
                    return { themeId: theme.id, words };
                });

                ticketAliasData.forEach((ticket) => {
                    if (assignedTicketIds.has(ticket.id)) return;

                    const ticketWords = new Set(tokenize(ticket.text).filter((w) => !stopWords.has(w)));
                    let bestThemeId = normalizedThemes[0]?.id;
                    let bestScore = -1;

                    themeLexicon.forEach(({ themeId, words }) => {
                        let score = 0;
                        ticketWords.forEach((w) => {
                            if (words.has(w)) score += 1;
                        });
                        if (score > bestScore) {
                            bestScore = score;
                            bestThemeId = themeId;
                        }
                    });

                    normalizedAssignments.push({
                        ticketId: ticket.id,
                        themeId: bestThemeId || normalizedThemes[0]?.id
                    });
                    assignedTicketIds.add(ticket.id);
                });
            }

            callback({
                success: true,
                data: {
                    themes: normalizedThemes,
                    assignments: normalizedAssignments
                }
            });
        } catch (error) {
            console.error("AI Grouping failed:", error);
            const message = String(error?.message || '');
            if (/api key|unauth|auth|401|403|invalid/i.test(message)) {
                return callback({
                    error: 'AI grouping unavailable: Gemini API key is not recognized by Google.'
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

    socket.on('toggle-ready', ({ sessionId, isReady }) => {
        const userData = socketToUser.get(socket.id);
        if (!userData || userData.sessionId !== sessionId) return;

        userData.user.isReady = !!isReady;
        socketToUser.set(socket.id, userData);

        console.log(`User ${userData.user.name} toggled ready: ${userData.user.isReady}`);

        // Broadcast updated participant list
        const participants = getParticipants(sessionId);
        io.to(sessionId).emit('participants-updated', participants);
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
