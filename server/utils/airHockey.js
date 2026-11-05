// Air Hockey ice breaker: one live game per session, hosted in this process, its frames carried
// by Socket.io. The game (air-hockey/room) is authoritative: clients only send their paddle
// target, the room sends back snapshots at 60 Hz. Nothing of it touches the session row or the
// database: the session only records that the game is on (step 'play').
// In-process: every player of a session must reach this instance. One app container today; more
// would need sticky routing by session id.
import { Room } from 'air-hockey/room';

/** A short match: three rounds, one scene each (ice, sea, desert), first to 3 goals. */
export const AIR_HOCKEY_RULES = { goals: 3, rounds: 3 };

/** Inputs are 5 bytes and a join a few dozen: anything bigger is dropped. */
export const MAX_FRAME = 1024;

/** The lobby's start: the game is on for everyone in the session. */
export const startAirHockeyGame = (state, now = Date.now()) => ({ ...state, step: 'play', roundStartedAt: now });

// Socket.io hands binary over as a Buffer, often a view into a larger pool: copy its exact bytes.
export const toArrayBuffer = (data) => {
    if (data instanceof ArrayBuffer) return data;
    if (ArrayBuffer.isView(data)) return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    return null;
};

export const createAirHockeyHost = ({ rules = AIR_HOCKEY_RULES, makeRoom = (r) => new Room(r) } = {}) => {
    /** sessionId -> { room, conns } */
    const games = new Map();
    /** socket id -> { sessionId, conn, name } */
    const peers = new Map();

    const leave = (socketId) => {
        const peer = peers.get(socketId);
        if (!peer) return;
        peers.delete(socketId);
        const game = games.get(peer.sessionId);
        if (!game) return;
        game.room.disconnect(peer.conn);
        game.conns.delete(peer.conn);
        if (game.conns.size === 0) {
            game.room.stop();
            games.delete(peer.sessionId);
        }
    };

    // `send` delivers one frame to that socket. The name is the session's, never the client's.
    const join = (socketId, sessionId, name, send) => {
        leave(socketId);
        let game = games.get(sessionId);
        if (!game) {
            game = { room: makeRoom(rules), conns: new Set() };
            games.set(sessionId, game);
            game.room.start();
        }
        const conn = { send };
        game.conns.add(conn);
        peers.set(socketId, { sessionId, conn, name });
        game.room.connect(conn);
    };

    const receive = (socketId, data) => {
        const peer = peers.get(socketId);
        const game = peer && games.get(peer.sessionId);
        if (!game) return;
        if (typeof data === 'string') {
            if (data.length > MAX_FRAME) return;
            let msg;
            try { msg = JSON.parse(data); } catch { return; }
            // The only text a client sends: its join, rewritten with the session's name for it.
            if (msg?.t === 'join') game.room.receive(peer.conn, JSON.stringify({ t: 'join', name: peer.name }));
            return;
        }
        const bytes = toArrayBuffer(data);
        if (bytes && bytes.byteLength <= MAX_FRAME) game.room.receive(peer.conn, bytes);
    };

    /** Players in a session's game. */
    const size = (sessionId) => games.get(sessionId)?.room.size ?? 0;

    return { join, receive, leave, size };
};
