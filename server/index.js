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
import { connectDB, sequelize } from './db.js';
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
const pubClient = createClient({
    url: redisUrl,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 200, 5000)
    }
});
const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error('Redis Pub Client Error', err));
subClient.on('error', (err) => console.error('Redis Sub Client Error', err));

// Dedicated pub/sub channel for cross-node session broadcasts.
// The socket.io Redis adapter handles plain io.to(room).emit() across nodes,
// but emitSessionUpdateForRoom needs per-user filtering and iterates LOCAL
// sockets only. We publish updates here so every node runs its local emit.
const SESSION_UPDATE_CHANNEL = 'retro:session-update';
const sessionUpdateSub = pubClient.duplicate();
sessionUpdateSub.on('error', (err) => console.error('Session Update Sub Error', err));

try {
    await pubClient.connect();
    await subClient.connect();
    await sessionUpdateSub.connect();
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

// Per-session rate limit for expensive AI operations.
// `group`: up to 3 calls in a 30s burst window that opens on the FIRST call;
// once the window closes (or the 3 tokens are spent), only one call per 30s.
// No cumul: unused burst tokens expire with the window, and the steady-state
// cooldown does not stockpile — long inactivity gives a single free call,
// not a backlog. `icebreaker`: no burst, plain 30s cooldown (unchanged).
// State is in-memory per node; acceptable trade-off.
const aiOpLastCall = new Map(); // key -> { burstRemaining, burstExpiresAt, lastCallAt }
const AI_LIMITS = {
    group: { burst: 3, burstWindowMs: 30_000, cooldownMs: 30_000 },
    icebreaker: { burst: 0, burstWindowMs: 0, cooldownMs: 30_000 }
};
const checkAiCooldown = (op, sessionId) => {
    const cfg = AI_LIMITS[op] ?? { burst: 0, burstWindowMs: 0, cooldownMs: 30_000 };
    const key = `${op}:${sessionId}`;
    const now = Date.now();
    const entry = aiOpLastCall.get(key) ?? { burstRemaining: cfg.burst, burstExpiresAt: 0, lastCallAt: 0 };

    // Open burst window on the very first call for this session.
    if (entry.lastCallAt === 0 && cfg.burst > 0) {
        entry.burstExpiresAt = now + cfg.burstWindowMs;
    }

    // Burst path: tokens left AND window still open.
    if (entry.burstRemaining > 0 && now < entry.burstExpiresAt) {
        entry.burstRemaining -= 1;
        entry.lastCallAt = now;
        aiOpLastCall.set(key, entry);
        return 0;
    }

    // Burst expired or exhausted — invalidate any leftover tokens (no cumul).
    entry.burstRemaining = 0;

    // Steady state: flat 30s gap from the last allowed call.
    const remaining = cfg.cooldownMs - (now - entry.lastCallAt);
    if (remaining <= 0) {
        entry.lastCallAt = now;
        aiOpLastCall.set(key, entry);
        return 0;
    }
    aiOpLastCall.set(key, entry);
    return Math.ceil(remaining / 1000);
};

// Redis-backed participant state (Global across all instances)
const getParticipants = async (sessionId) => {
    try {
        const userJsonList = await pubClient.hVals(`session:${sessionId}:participants`);
        const storedParticipants = userJsonList.map(json => JSON.parse(json));

        // Get all active sockets in the room across the entire Socket.io cluster
        const activeSockets = await io.in(sessionId).fetchSockets();
        const activeUserIds = new Set(activeSockets.map(s => s.data?.userId).filter(Boolean));

        const activeParticipants = [];
        for (const participant of storedParticipants) {
            if (activeUserIds.has(participant.id)) {
                activeParticipants.push(participant);
            } else {
                // Prune ghost participants from Redis hash
                await pubClient.hDel(`session:${sessionId}:participants`, participant.id);
            }
        }
        return activeParticipants;
    } catch (error) {
        console.error('Error fetching participants from Redis:', error);
        return [];
    }
};

// Helper functions moved to server/utils/sessionHelper.js

// Local emit: iterate THIS node's sockets in the session and push a filtered view.
// Optionally resets isReady for everyone in the session on this node.
const localEmitSessionUpdate = ({ sessionId, sessionData, status, resetReady }) => {
    if (resetReady) {
        for (const [sid, data] of socketToUser.entries()) {
            if (data.sessionId === sessionId) {
                data.user.isReady = false;
                socketToUser.set(sid, data);
            }
        }
    }
    const socketIds = sessionToSockets.get(sessionId);
    if (!socketIds) return;
    for (const socketId of socketIds) {
        const data = socketToUser.get(socketId);
        if (!data) continue;
        io.to(socketId).emit('session-updated', buildVisibleSessionForUser(sessionData, data.user, status));
    }
};

// Publish to all nodes (including self — Redis pub/sub delivers to publishing
// subscriber too via the separate sub connection).
const emitSessionUpdateForRoom = (sessionId, sessionData, status, resetReady = false) => {
    const payload = JSON.stringify({ sessionId, sessionData, status, resetReady });
    pubClient.publish(SESSION_UPDATE_CHANNEL, payload).catch((err) => {
        console.error('Session update publish failed:', err);
        // Fallback: still emit locally so this node's clients aren't starved.
        localEmitSessionUpdate({ sessionId, sessionData, status, resetReady });
    });
};

await sessionUpdateSub.subscribe(SESSION_UPDATE_CHANNEL, (message) => {
    try {
        localEmitSessionUpdate(JSON.parse(message));
    } catch (err) {
        console.error('Session update sub handler failed:', err);
    }
});

async function authorizeActor(socketId, rawSessionId, { requireAdmin = false } = {}) {
    const actor = socketToUser.get(socketId)?.user;
    if (!actor?.id) return { error: 'Missing actor' };
    if (!rawSessionId) return { error: 'Missing sessionId' };
    const sessionId = String(rawSessionId).trim();

    const session = await Session.findOne({ where: { sessionId } });
    if (!session) return { error: 'Session not found' };

    const isAdmin = !!(actor.isAdmin && String(session.adminId) === String(actor.id));
    if (requireAdmin && !isAdmin) return { error: 'Unauthorized' };

    if (!isAdmin) {
        const participants = await getParticipants(sessionId);
        const isParticipant = participants.some(p => String(p.id) === String(actor.id));
        if (!isParticipant) return { error: 'Unauthorized' };
    }

    return { actor, session, sessionId, isAdmin };
}

// Marker key on the mutator return: tells mutateSession to reset isReady
// cluster-wide after commit. Stripped before persisting.
const RESET_READY = '__resetReady';

async function mutateSession(sessionId, _ignoredStaleSession, mutator) {
    const MAX_RETRIES = 3;
    let lastError;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const tx = await sequelize.transaction();
        try {
            // Row lock prevents concurrent mutators from racing on the same session.
            const session = await Session.findOne({
                where: { sessionId },
                lock: tx.LOCK.UPDATE,
                transaction: tx
            });
            if (!session) {
                await tx.rollback();
                return { error: 'Session not found' };
            }

            const existingData = typeof session.data === 'string'
                ? JSON.parse(session.data)
                : (session.data || {});
            const updatedData = mutator(existingData);
            if (!updatedData) {
                await tx.rollback();
                return { error: 'No change' };
            }

            const resetReady = updatedData[RESET_READY] === true;
            if (resetReady) delete updatedData[RESET_READY];

            const finalData = buildSessionDataWithMetadata(session, { ...updatedData, id: sessionId });
            await Session.upsert(
                { sessionId, adminId: session.adminId, data: finalData },
                { transaction: tx }
            );
            await tx.commit();

            emitSessionUpdateForRoom(sessionId, finalData, session.status, resetReady);
            return { success: true, data: finalData };
        } catch (err) {
            await tx.rollback().catch(() => {});
            lastError = err;
            const msg = err?.parent?.message || err?.original?.message || err?.message || '';
            const isTransient = /deadlock|lock wait timeout|ER_LOCK_DEADLOCK|ER_LOCK_WAIT_TIMEOUT/i.test(msg);
            if (!isTransient || attempt === MAX_RETRIES - 1) break;
            await new Promise((r) => setTimeout(r, 30 * (attempt + 1) + Math.floor(Math.random() * 30)));
        }
    }

    console.error('[mutateSession] failed after retries:', lastError);
    return { error: lastError?.message || 'Mutation failed' };
}

const cap = (val, max) => String(val ?? '').slice(0, max);
const isStr = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;

const sanitizeIceBreakerState = (raw) => {
    if (raw === undefined || raw === null) return raw;
    if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;

    const questions = Array.isArray(raw.questions)
        ? raw.questions.slice(0, 100).map(q => {
            if (!q || typeof q !== 'object') return null;
            const participantId = String(q.participantId ?? '').slice(0, 64);
            const participantName = String(q.participantName ?? '').slice(0, 64);
            const question = String(q.question ?? '').slice(0, 500);
            if (!participantId || !question) return null;
            return { participantId, participantName, question };
        }).filter(Boolean)
        : [];

    const currentIndex = Number.isInteger(raw.currentIndex) && raw.currentIndex >= 0
        ? Math.min(raw.currentIndex, Math.max(0, questions.length - 1))
        : 0;

    return { questions, currentIndex };
};

const buildSessionDataWithMetadata = (session, sessionData) => ({
    ...sessionData,
    createdAt: session?.createdAt?.toISOString?.() || sessionData?.createdAt
});

// sanitizeUser and verifyAdminTokenForUser moved to sessionHelper.js

// applyParticipantVotingUpdate moved to sessionHelper.js

// AI Helper
const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
const hasUsableGeminiKey =
    !!geminiApiKey &&
    !/replace_with|your_|changeme|example|dummy/i.test(geminiApiKey);
const rawAiGroupingModelFallbacks = (process.env.AI_GROUPING_MODEL_FALLBACKS || '').trim();
const defaultAiGroupingModels = [
    'gemini-3-flash',
    'gemini-3.1-flash-lite',
    'gemma-4-31b-it',
    'gemma-4-26b-it',
    'gemini-2.5-flash'
];
const aiGroupingModels = (rawAiGroupingModelFallbacks
    ? rawAiGroupingModelFallbacks.split(',')
    : defaultAiGroupingModels
).map((model) => model.trim()).filter(Boolean);
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

const isAiAuthError = (message) => /api key|unauth|auth|401|403|invalid/i.test(message);
const isAiNetworkError = (message) => /fetch failed|ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT/i.test(message);
const isRetryableAiModelError = (message) => /429|quota|rate limit|resource exhausted|exhausted|unavailable|overloaded|internal|deadline|503|500|model.+not found|unsupported|not supported/i.test(message);

const generateAiGroupingContent = async (prompt) => {
    let lastError = null;

    for (const model of aiGroupingModels) {
        try {
            const result = await ai.models.generateContent({
                model,
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

            return { result, model };
        } catch (error) {
            lastError = error;
            const message = String(error?.message || '');
            const canFallback = isRetryableAiModelError(message) && model !== aiGroupingModels[aiGroupingModels.length - 1];

            console.warn(`[AI] Model ${model} failed for ticket grouping: ${message}`);
            if (canFallback) {
                console.warn(`[AI] Falling back to next model after ${model}.`);
                continue;
            }

            error.aiModel = model;
            throw error;
        }
    }

    throw lastError || new Error('No AI grouping model configured.');
};

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
                const sessionData = buildSessionDataWithMetadata(
                    session,
                    typeof session.data === 'string' ? JSON.parse(session.data) : session.data
                );
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
                socket.data.userId = joinedUser.id; // Share on socket.data for cluster presence check

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
                    socket.data.userId = joinedUser.id; // Share on socket.data for cluster presence check

                    if (!sessionToSockets.has(sessionId)) {
                        sessionToSockets.set(sessionId, new Set());
                    }
                    sessionToSockets.get(sessionId).add(socket.id);

                    await pubClient.hSet(`session:${sessionId}:participants`, joinedUser.id, JSON.stringify(joinedUser));

                    console.log(`User ${joinedUser.name} (${socket.id}) joined session room: "${sessionId}" | Global users in session: ${await pubClient.hLen(`session:${sessionId}:participants`)}`);

                    socket.emit('session-updated', buildVisibleSessionForUser(buildSessionDataWithMetadata(newSession, defaultData), joinedUser));
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

    // Removed: 'update-session' blanket handler. All mutations now go through
    // the atomic event handlers below, which validate per-field and enforce
    // server-side authorization. Reject any stale callers loudly.
    socket.on('update-session', (_payload, callback) => {
        const actorId = socketToUser.get(socket.id)?.user?.id;
        console.warn(`[Removed] update-session called by ${actorId ?? 'unknown'} — rejected. Client is out of date.`);
        if (typeof callback === 'function') {
            callback({ error: 'update-session is no longer supported. Update the client.' });
        }
    });

    // ===== Atomic event handlers (replace blanket update-session) =====

    const VALID_COLUMNS = new Set(['What went well', 'What went less well', 'What do we want to try next', 'What puzzles us']);
    const VALID_PHASES = new Set(['ICE_BREAKER', 'BRAINSTORM', 'GROUPING', 'VOTING', 'DISCUSSION']);

    const cb = (callback, payload) => { if (typeof callback === 'function') callback(payload); };

    // --- BRAINSTORM ---

    socket.on('brainstorm:add-ticket', async ({ sessionId, ticket }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId);
            if (auth.error) return cb(callback, auth);
            if (!ticket || typeof ticket !== 'object') return cb(callback, { error: 'Invalid ticket' });

            const safeTicket = {
                id: cap(ticket.id, 64),
                text: cap(ticket.text, 2000),
                column: cap(ticket.column, 64),
                author: cap(ticket.author, 64),
                authorId: String(auth.actor.id),
                votes: 0,
                voterIds: []
            };
            if (!safeTicket.id || !safeTicket.text || !VALID_COLUMNS.has(safeTicket.column)) {
                return cb(callback, { error: 'Invalid ticket fields' });
            }

            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                if (data.phase !== 'BRAINSTORM') return null;
                return { ...data, tickets: [...(data.tickets || []), safeTicket] };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[brainstorm:add-ticket]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('brainstorm:edit-ticket', async ({ sessionId, ticketId, text }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId);
            if (auth.error) return cb(callback, auth);
            const id = cap(ticketId, 64);
            const newText = cap(text, 2000);
            if (!id || !newText) return cb(callback, { error: 'Invalid fields' });

            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const tickets = data.tickets || [];
                const t = tickets.find(x => x.id === id);
                if (!t) return null;
                if (!auth.isAdmin && String(t.authorId) !== String(auth.actor.id)) return null;
                return { ...data, tickets: tickets.map(x => x.id === id ? { ...x, text: newText } : x) };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[brainstorm:edit-ticket]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('brainstorm:delete-ticket', async ({ sessionId, ticketId }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId);
            if (auth.error) return cb(callback, auth);
            const id = cap(ticketId, 64);
            if (!id) return cb(callback, { error: 'Invalid ticketId' });

            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const tickets = data.tickets || [];
                const t = tickets.find(x => x.id === id);
                if (!t) return null;
                if (!auth.isAdmin && String(t.authorId) !== String(auth.actor.id)) return null;
                return { ...data, tickets: tickets.filter(x => x.id !== id) };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[brainstorm:delete-ticket]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('brainstorm:set-timer-duration', async ({ sessionId, duration }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId, { requireAdmin: true });
            if (auth.error) return cb(callback, auth);
            const d = Number(duration);
            if (!Number.isFinite(d) || d < 1 || d > 60) return cb(callback, { error: 'Invalid duration' });

            const res = await mutateSession(auth.sessionId, auth.session, (data) => ({ ...data, brainstormTimerDuration: d }));
            cb(callback, res);
        } catch (e) {
            console.error('[brainstorm:set-timer-duration]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('brainstorm:start-timer', async ({ sessionId }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId, { requireAdmin: true });
            if (auth.error) return cb(callback, auth);

            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const duration = Number(data.brainstormTimerDuration) || 10;
                return { ...data, brainstormTimerEndsAt: Date.now() + duration * 60 * 1000 };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[brainstorm:start-timer]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('brainstorm:reset-timer', async ({ sessionId }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId, { requireAdmin: true });
            if (auth.error) return cb(callback, auth);

            const res = await mutateSession(auth.sessionId, auth.session, (data) => ({ ...data, brainstormTimerEndsAt: null }));
            cb(callback, res);
        } catch (e) {
            console.error('[brainstorm:reset-timer]', e);
            cb(callback, { error: e.message });
        }
    });

    // --- GROUPING ---

    socket.on('grouping:move-ticket', async ({ sessionId, ticketId, themeId }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId);
            if (auth.error) return cb(callback, auth);
            const id = cap(ticketId, 64);
            const tId = themeId == null ? undefined : cap(themeId, 64);
            if (!id) return cb(callback, { error: 'Invalid ticketId' });

            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const tickets = data.tickets || [];
                if (!tickets.some(t => t.id === id)) return null;
                if (tId !== undefined && !(data.themes || []).some(t => t.id === tId)) return null;
                return { ...data, tickets: tickets.map(t => t.id === id ? { ...t, themeId: tId } : t) };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[grouping:move-ticket]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('grouping:create-theme', async ({ sessionId, theme }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId);
            if (auth.error) return cb(callback, auth);
            if (!theme || typeof theme !== 'object') return cb(callback, { error: 'Invalid theme' });

            const safeTheme = {
                id: cap(theme.id, 64),
                name: cap(theme.name, 200),
                description: cap(theme.description, 500),
                votes: 0,
                voterIds: []
            };
            if (!safeTheme.id || !safeTheme.name) return cb(callback, { error: 'Invalid theme fields' });

            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const themes = data.themes || [];
                if (themes.some(t => t.id === safeTheme.id)) return null;
                if (themes.length >= 50) return null;
                return { ...data, themes: [...themes, safeTheme] };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[grouping:create-theme]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('grouping:delete-theme', async ({ sessionId, themeId }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId);
            if (auth.error) return cb(callback, auth);
            const id = cap(themeId, 64);
            if (!id) return cb(callback, { error: 'Invalid themeId' });

            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const themes = data.themes || [];
                if (!themes.some(t => t.id === id)) return null;
                return {
                    ...data,
                    themes: themes.filter(t => t.id !== id),
                    tickets: (data.tickets || []).map(t => t.themeId === id ? { ...t, themeId: undefined } : t)
                };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[grouping:delete-theme]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('grouping:rename-theme', async ({ sessionId, themeId, name }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId);
            if (auth.error) return cb(callback, auth);
            const id = cap(themeId, 64);
            const newName = cap(name, 200);
            if (!id || !newName) return cb(callback, { error: 'Invalid fields' });

            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const themes = data.themes || [];
                if (!themes.some(t => t.id === id)) return null;
                return { ...data, themes: themes.map(t => t.id === id ? { ...t, name: newName } : t) };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[grouping:rename-theme]', e);
            cb(callback, { error: e.message });
        }
    });

    // --- VOTING ---

    socket.on('voting:add-vote', async ({ sessionId, themeId }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId);
            if (auth.error) return cb(callback, auth);
            const id = cap(themeId, 64);
            if (!id) return cb(callback, { error: 'Invalid themeId' });

            const actorId = String(auth.actor.id);
            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const themes = data.themes || [];
                if (!themes.some(t => t.id === id)) return null;
                const used = themes.reduce((acc, t) => acc + (t.voterIds || []).filter(v => String(v) === actorId).length, 0);
                if (used >= 5) return null;
                return {
                    ...data,
                    themes: themes.map(t => t.id === id ? {
                        ...t,
                        votes: (t.votes || 0) + 1,
                        voterIds: [...(t.voterIds || []), actorId]
                    } : t)
                };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[voting:add-vote]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('voting:remove-vote', async ({ sessionId, themeId }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId);
            if (auth.error) return cb(callback, auth);
            const id = cap(themeId, 64);
            if (!id) return cb(callback, { error: 'Invalid themeId' });

            const actorId = String(auth.actor.id);
            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const themes = data.themes || [];
                const theme = themes.find(t => t.id === id);
                if (!theme) return null;
                const voterIds = [...(theme.voterIds || [])];
                const idx = voterIds.findLastIndex(v => String(v) === actorId);
                if (idx === -1) return null;
                voterIds.splice(idx, 1);
                return {
                    ...data,
                    themes: themes.map(t => t.id === id ? {
                        ...t,
                        votes: Math.max(0, (t.votes || 0) - 1),
                        voterIds
                    } : t)
                };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[voting:remove-vote]', e);
            cb(callback, { error: e.message });
        }
    });

    // --- DISCUSSION ---

    socket.on('discussion:add-action', async ({ sessionId, action }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId);
            if (auth.error) return cb(callback, auth);
            if (!action || typeof action !== 'object') return cb(callback, { error: 'Invalid action' });

            const safe = {
                id: cap(action.id, 64),
                text: cap(action.text, 1000),
                assigneeId: cap(action.assigneeId, 64),
                assigneeName: cap(action.assigneeName, 64)
            };
            if (!safe.id || !safe.text || !safe.assigneeId) return cb(callback, { error: 'Invalid action fields' });

            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const actions = data.actions || [];
                if (actions.some(a => a.id === safe.id)) return null;
                if (actions.length >= 200) return null;
                return { ...data, actions: [...actions, safe] };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[discussion:add-action]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('discussion:delete-action', async ({ sessionId, actionId }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId);
            if (auth.error) return cb(callback, auth);
            const id = cap(actionId, 64);
            if (!id) return cb(callback, { error: 'Invalid actionId' });

            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const actions = data.actions || [];
                if (!actions.some(a => a.id === id)) return null;
                return { ...data, actions: actions.filter(a => a.id !== id) };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[discussion:delete-action]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('discussion:set-current-theme', async ({ sessionId, index }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId, { requireAdmin: true });
            if (auth.error) return cb(callback, auth);
            const i = Number(index);
            if (!Number.isInteger(i) || i < 0) return cb(callback, { error: 'Invalid index' });

            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const max = (data.themes || []).length - 1;
                if (max < 0 || i > max) return null;
                return { ...data, currentThemeIndex: i };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[discussion:set-current-theme]', e);
            cb(callback, { error: e.message });
        }
    });

    // --- SESSION-LEVEL ---

    socket.on('session:set-default-theme', async ({ sessionId, themeId }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId, { requireAdmin: true });
            if (auth.error) return cb(callback, auth);
            const id = cap(themeId, 64);
            if (!id) return cb(callback, { error: 'Invalid themeId' });

            const res = await mutateSession(auth.sessionId, auth.session, (data) => ({ ...data, defaultThemeId: id }));
            cb(callback, res);
        } catch (e) {
            console.error('[session:set-default-theme]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('session:set-phase', async ({ sessionId, phase, themes, currentThemeIndex }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId, { requireAdmin: true });
            if (auth.error) return cb(callback, auth);
            const p = cap(phase, 32);
            if (!VALID_PHASES.has(p)) return cb(callback, { error: 'Invalid phase' });

            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                const next = { ...data, phase: p };
                if (Array.isArray(themes)) {
                    const existingIds = new Set((data.themes || []).map(t => t.id));
                    const reordered = themes
                        .map(t => (data.themes || []).find(orig => orig.id === t?.id))
                        .filter(Boolean);
                    if (reordered.length === (data.themes || []).length && reordered.every(t => existingIds.has(t.id))) {
                        next.themes = reordered;
                    }
                }
                if (Number.isInteger(currentThemeIndex) && currentThemeIndex >= 0) {
                    next.currentThemeIndex = currentThemeIndex;
                }
                // Reset ready status for everyone when phase changes — flagged
                // for cross-node propagation; mutateSession strips the marker
                // before persisting and triggers the reset on every node.
                if (data.phase !== p) next[RESET_READY] = true;
                return next;
            });
            cb(callback, res);
        } catch (e) {
            console.error('[session:set-phase]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('session:apply-themes', async ({ sessionId, themes, ticketAssignments }, callback) => {
        try {
            const auth = await authorizeActor(socket.id, sessionId, { requireAdmin: true });
            if (auth.error) return cb(callback, auth);
            if (!Array.isArray(themes)) return cb(callback, { error: 'Invalid themes' });
            const assignments = (ticketAssignments && typeof ticketAssignments === 'object') ? ticketAssignments : {};

            const safeThemes = themes.slice(0, 50).map(t => {
                if (!t || typeof t !== 'object') return null;
                const id = cap(t.id, 64);
                const name = cap(t.name, 200);
                if (!id || !name) return null;
                return {
                    id,
                    name,
                    description: cap(t.description, 500),
                    votes: 0,
                    voterIds: []
                };
            }).filter(Boolean);

            if (safeThemes.length === 0) return cb(callback, { error: 'No valid themes' });

            const themeIds = new Set(safeThemes.map(t => t.id));
            const fallbackId = safeThemes[0].id;

            // Allowed only while themes are being formed (BRAINSTORM right before
            // transition to GROUPING, or GROUPING during regenerate). Calling it
            // in VOTING/DISCUSSION would wipe votes — block at server.
            const res = await mutateSession(auth.sessionId, auth.session, (data) => {
                if (data.phase !== 'BRAINSTORM' && data.phase !== 'GROUPING') return null;
                return {
                    ...data,
                    themes: safeThemes,
                    tickets: (data.tickets || []).map(t => {
                        const assigned = cap(assignments[t.id], 64);
                        return { ...t, themeId: themeIds.has(assigned) ? assigned : fallbackId };
                    })
                };
            });
            cb(callback, res);
        } catch (e) {
            console.error('[session:apply-themes]', e);
            cb(callback, { error: e.message });
        }
    });

    socket.on('toggle-reaction', async ({ sessionId, ticketId, emoji }) => {
        const actor = socketToUser.get(socket.id)?.user;
        const actorSessionId = socketToUser.get(socket.id)?.sessionId;
        if (!sessionId || !ticketId || !emoji || !actor?.id || actorSessionId !== sessionId) return;

        try {
            const session = await Session.findOne({ where: { sessionId } });
            if (!session) return;

            const sessionData = buildSessionDataWithMetadata(
                session,
                typeof session.data === 'string' ? JSON.parse(session.data) : session.data
            );
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

        const cooldown = checkAiCooldown('group', sessionId);
        if (cooldown > 0) return callback({ error: `Please wait ${cooldown}s before regenerating groups.` });

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

            const { result, model } = await generateAiGroupingContent(prompt);
            console.log(`[AI] Ticket grouping generated with model: ${model}`);

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

    socket.on('advance-ice-breaker', async ({ sessionId: rawSessionId }, callback) => {
        const actor = socketToUser.get(socket.id)?.user;
        if (!rawSessionId || !actor?.id) return typeof callback === 'function' && callback({ error: 'Missing data' });
        const sessionId = rawSessionId.trim();

        try {
            const session = await Session.findOne({ where: { sessionId } });
            if (!session) return typeof callback === 'function' && callback({ error: 'Session not found' });
            if (!actor.isAdmin || String(session.adminId) !== String(actor.id)) {
                return typeof callback === 'function' && callback({ error: 'Unauthorized' });
            }

            const existingData = typeof session.data === 'string' ? JSON.parse(session.data) : session.data;
            const questions = existingData?.iceBreakerState?.questions ?? [];
            const currentIndex = existingData?.iceBreakerState?.currentIndex ?? 0;

            if (currentIndex >= questions.length - 1) {
                return typeof callback === 'function' && callback({ error: 'Already at last participant' });
            }

            const updatedData = {
                ...existingData,
                iceBreakerState: { ...existingData.iceBreakerState, currentIndex: currentIndex + 1 }
            };
            await Session.update({ data: updatedData }, { where: { sessionId } });
            emitSessionUpdateForRoom(sessionId, updatedData, session.status);
            if (typeof callback === 'function') callback({ success: true });
        } catch (error) {
            console.error('[IceBreaker] advance error:', error);
            if (typeof callback === 'function') callback({ error: error.message });
        }
    });

    socket.on('generate-ice-breaker', async ({ sessionId: rawSessionId }, callback) => {
        const actor = socketToUser.get(socket.id)?.user;
        if (!rawSessionId || !actor?.id) return typeof callback === 'function' && callback({ error: 'Missing data' });
        const sessionId = rawSessionId.trim();

        if (!ai) {
            return typeof callback === 'function' && callback({ error: 'AI unavailable: set a valid GEMINI_API_KEY.' });
        }

        const cooldown = checkAiCooldown('icebreaker', sessionId);
        if (cooldown > 0) return typeof callback === 'function' && callback({ error: `Please wait ${cooldown}s before regenerating questions.` });

        try {
            const session = await Session.findOne({ where: { sessionId } });
            if (!session) return typeof callback === 'function' && callback({ error: 'Session not found' });
            if (!actor.isAdmin || String(session.adminId) !== String(actor.id)) {
                return typeof callback === 'function' && callback({ error: 'Unauthorized' });
            }

            const participants = await getParticipants(sessionId);
            if (participants.length === 0) {
                return typeof callback === 'function' && callback({ error: 'No participants in session yet.' });
            }

            const names = participants.map(p =>
                p.name.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 64)
            );
            const n = names.length;

            const questionCategories = [
                'favorite things', 'hypothetical scenarios', 'would-you-rather',
                'travel & culture', 'childhood memories', 'superpowers', 'food',
                'unpopular opinions', 'hidden talents', 'bucket list', 'time travel',
                'desert island', 'dream job', 'fictional worlds'
            ];
            const shuffledCategories = questionCategories
                .sort(() => Math.random() - 0.5)
                .slice(0, 5)
                .join(', ');

            const prompt = `Generate ${n} fun and diverse icebreaker questions for a team meeting. One unique question per person.
Write every question in French (français).
Make them light-hearted, inclusive, and suitable for a professional setting.
Mix question types this time: ${shuffledCategories}.
Avoid common or overused questions. Be creative and surprising.
Team members: ${names.map(name => `"${name.replace(/"/g, '')}"`).join(', ')}
Return a JSON object with a "questions" array of exactly ${n} strings in French (one per team member, in the same order).`;

            let questions = null;
            for (const model of aiGroupingModels) {
                try {
                    const result = await ai.models.generateContent({
                        model,
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 1.5,
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    questions: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ['questions']
                            }
                        }
                    });
                    const rawText = result?.text ?? result?.response?.text?.();
                    const cleanText = String(rawText ?? '').trim()
                        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
                    const parsed = JSON.parse(cleanText);
                    questions = Array.isArray(parsed?.questions) ? parsed.questions : null;
                    if (questions) break;
                } catch (err) {
                    const msg = String(err?.message || '');
                    if (isRetryableAiModelError(msg) && model !== aiGroupingModels[aiGroupingModels.length - 1]) continue;
                    throw err;
                }
            }

            if (!questions || questions.length === 0) {
                return typeof callback === 'function' && callback({ error: 'AI returned no questions.' });
            }

            const iceBreakerState = {
                questions: participants.map((p, i) => ({
                    participantId: p.id,
                    participantName: p.name,
                    question: questions[i] || 'Quelle est une chose que tes collègues ne savent probablement pas sur toi ?'
                })),
                currentIndex: 0
            };

            const existingData = typeof session.data === 'string' ? JSON.parse(session.data) : session.data;
            const updatedData = { ...existingData, iceBreakerState };
            await Session.update({ data: updatedData }, { where: { sessionId } });
            emitSessionUpdateForRoom(sessionId, updatedData, session.status);
            console.log(`[IceBreaker] Generated ${iceBreakerState.questions.length} questions for session ${sessionId}`);
            if (typeof callback === 'function') callback({ success: true });
        } catch (error) {
            console.error('[IceBreaker] Error:', error);
            if (typeof callback === 'function') callback({ error: 'Failed to generate questions: ' + error.message });
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
