// Tiny FPS ice breaker: a capture the flag in 3D, played full screen in a tab of its own. One room
// per session and map, hosted in this process, its frames carried by Socket.io like Air Hockey's
// (see airHockey.js). The room (@korial29/tiny-fps/room) is authoritative: clients send 12-byte
// inputs, the room sends snapshots at 30 Hz. The session only records the map and step 'play'.
//
// The game tab does not join the retro session ('join-session'): its socket going away would take
// the player out of the participants while the retro tab is still open. The retro tab asks for a
// ticket instead, and the game tab joins the room with it.
import jwt from 'jsonwebtoken';
import { MAPS, Room } from '@korial29/tiny-fps/room';
import { toArrayBuffer } from './airHockey.js';

export const FPS_MAPS = Object.keys(MAPS);
export const DEFAULT_FPS_MAP = 'highline';

/** Inputs are 12 bytes, a join or a change of character a few dozen: anything bigger is dropped. */
export const MAX_FPS_FRAME = 256;
/** The game's own cap on a name. */
export const FPS_NAME_MAX = 16;
/** A ticket only lets its holder into a running game of its session, so it can outlive a match. */
export const FPS_TICKET_TTL = '4h';

export const isFpsMap = (map) => typeof map === 'string' && Object.hasOwn(MAPS, map);

/**
 * Whether a session's Tiny FPS game is on: the ice breaker phase, this game, started, the session
 * open. A game tab gets in only then, and is sent off as soon as it no longer holds.
 */
export const isFpsOn = (data, status) =>
    status !== 'closed' && data?.phase === 'ICE_BREAKER' && data.iceBreakerState?.game === 'tinyfps' && data.iceBreakerState?.step === 'play';

/** The admin's pick in the lobby. */
export const setFpsMap = (state, map) => ({ ...state, fpsMap: map });

/** The lobby's start: the game is on, on the map the admin picked. */
export const startTinyFpsGame = (state, now = Date.now()) => ({
    ...state,
    step: 'play',
    fpsMap: isFpsMap(state.fpsMap) ? state.fpsMap : DEFAULT_FPS_MAP,
    roundStartedAt: now,
});

export const signFpsTicket = ({ sessionId, user }, secret = process.env.JWT_SECRET) =>
    jwt.sign(
        { type: 'fps', sessionId: String(sessionId), userId: String(user.id), name: String(user.name ?? 'Player').trim().slice(0, FPS_NAME_MAX) || 'Player' },
        secret,
        { expiresIn: FPS_TICKET_TTL },
    );

/** { sessionId, userId, name } or null. */
export const verifyFpsTicket = (ticket, secret = process.env.JWT_SECRET) => {
    if (typeof ticket !== 'string' || ticket.length > 2048) return null;
    try {
        const t = jwt.verify(ticket, secret);
        if (t?.type !== 'fps' || !t.sessionId || !t.userId) return null;
        return { sessionId: String(t.sessionId), userId: String(t.userId), name: String(t.name ?? 'Player') };
    } catch {
        return null;
    }
};

const pick = (msg, keys) => Object.fromEntries(keys.filter(k => Number.isInteger(msg[k])).map(k => [k, msg[k]]));
const CHOICE = ['body', 'tone', 'hair', 'role'];

/**
 * A client text, made safe: its join under the session's name and its character choice; nothing
 * else (no map pick, no bot watching). Null drops it.
 */
export const cleanFpsText = (data, name) => {
    if (data.length > MAX_FPS_FRAME) return null;
    let msg;
    try { msg = JSON.parse(data); } catch { return null; }
    if (msg?.t === 'join') return JSON.stringify({ t: 'join', name, ...pick(msg, CHOICE) });
    if (msg?.t === 'body' && Number.isInteger(msg.body)) return JSON.stringify({ t: 'body', ...pick(msg, CHOICE) });
    return null;
};

export const createTinyFpsHost = ({ makeRoom = (rules) => new Room(rules) } = {}) => {
    /** `${sessionId}:${map}` -> { room, conns } */
    const games = new Map();
    /** socket id -> { key, sessionId, conn, name, userId, over } */
    const peers = new Map();

    const leave = (socketId) => {
        const peer = peers.get(socketId);
        if (!peer) return;
        peers.delete(socketId);
        const game = games.get(peer.key);
        if (!game) return;
        game.room.disconnect(peer.conn);
        game.conns.delete(peer.conn);
        if (game.conns.size === 0) {
            game.room.stop();
            games.delete(peer.key);
        }
    };

    /** Takes a socket out of its game and tells its tab why ('ended', 'elsewhere'). */
    const sendOff = (socketId, reason) => {
        const over = peers.get(socketId)?.over;
        leave(socketId);
        over?.(reason);
    };

    // `send` delivers one frame to that socket, `over(reason)` tells its tab it was sent off. The
    // name is the session's, never the client's. A room per map: a game the admin starts again on
    // another map is a new room. One player per user and session: a tab that joins again (another
    // tab, or the same one back from a reconnect the server has not noticed yet) takes the place
    // of the older one, which is sent off.
    const join = (socketId, sessionId, map, name, send, { userId, over } = {}) => {
        leave(socketId);
        if (userId != null) {
            for (const [id, peer] of [...peers]) {
                if (peer.sessionId === sessionId && peer.userId === String(userId)) sendOff(id, 'elsewhere');
            }
        }
        const key = `${sessionId}:${map}`;
        let game = games.get(key);
        if (!game) {
            game = { room: makeRoom({ map, lockMap: true }), conns: new Set() };
            games.set(key, game);
            game.room.start();
        }
        const conn = { send };
        game.conns.add(conn);
        peers.set(socketId, {
            key,
            sessionId,
            conn,
            name: String(name).slice(0, FPS_NAME_MAX),
            userId: userId == null ? undefined : String(userId),
            over,
        });
        game.room.connect(conn);
    };

    /** The session's game is over (the retro moved on, another game, closed): every tab is sent off. */
    const end = (sessionId) => {
        for (const [id, peer] of [...peers]) {
            if (peer.sessionId === sessionId) sendOff(id, 'ended');
        }
    };

    const receive = (socketId, data) => {
        const peer = peers.get(socketId);
        const game = peer && games.get(peer.key);
        if (!game) return;
        if (typeof data === 'string') {
            const text = cleanFpsText(data, peer.name);
            if (text) game.room.receive(peer.conn, text);
            return;
        }
        const bytes = toArrayBuffer(data);
        if (bytes && bytes.byteLength <= MAX_FPS_FRAME) game.room.receive(peer.conn, bytes);
    };

    /** Players in a session's game on that map. */
    const size = (sessionId, map) => games.get(`${sessionId}:${map}`)?.room.size ?? 0;

    return { join, receive, leave, end, size };
};
