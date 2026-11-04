import { describe, it, expect, vi } from 'vitest';
import { AIR_HOCKEY_RULES, MAX_FRAME, createAirHockeyHost, startAirHockeyGame, toArrayBuffer } from './airHockey.js';

const fakeRoom = () => ({
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    receive: vi.fn(),
    size: 0,
});

const host = () => {
    const rooms = [];
    const h = createAirHockeyHost({ makeRoom: (rules) => { const r = { ...fakeRoom(), rules }; rooms.push(r); return r; } });
    return { h, rooms };
};

describe('air hockey host', () => {
    it('opens one game per session with the short rules, and closes it with its last player', () => {
        const { h, rooms } = host();
        h.join('a', 's1', 'Ana', vi.fn());
        h.join('b', 's1', 'Bob', vi.fn());
        h.join('c', 's2', 'Chloé', vi.fn());
        expect(rooms).toHaveLength(2);
        expect(rooms[0].rules).toEqual(AIR_HOCKEY_RULES);
        expect(rooms[0].start).toHaveBeenCalledOnce();
        expect(rooms[0].connect).toHaveBeenCalledTimes(2);
        h.leave('a');
        expect(rooms[0].stop).not.toHaveBeenCalled();
        h.leave('b');
        h.leave('b');
        expect(rooms[0].disconnect).toHaveBeenCalledTimes(2);
        expect(rooms[0].stop).toHaveBeenCalledOnce();
        h.join('d', 's1', 'Dan', vi.fn());
        expect(rooms).toHaveLength(3);
    });

    it("joins under the session's name, whatever name the client sends", () => {
        const { h, rooms } = host();
        h.join('a', 's1', 'Ana', vi.fn());
        h.receive('a', JSON.stringify({ t: 'join', name: 'Admin 👑' }));
        expect(rooms[0].receive).toHaveBeenCalledWith(expect.anything(), JSON.stringify({ t: 'join', name: 'Ana' }));
    });

    it('passes inputs as their exact bytes, drops oversized and stray frames', () => {
        const { h, rooms } = host();
        h.receive('nobody', new ArrayBuffer(5));
        h.join('a', 's1', 'Ana', vi.fn());
        // A Buffer is a view into a larger pool.
        const pool = new Uint8Array(64).fill(9);
        h.receive('a', Buffer.from(pool.buffer, 10, 5));
        const [, bytes] = rooms[0].receive.mock.calls[0];
        expect(bytes).toBeInstanceOf(ArrayBuffer);
        expect(bytes.byteLength).toBe(5);
        h.receive('a', new ArrayBuffer(MAX_FRAME + 1));
        h.receive('a', 'x'.repeat(MAX_FRAME + 1));
        h.receive('a', 'not json');
        h.receive('a', JSON.stringify({ t: 'other' }));
        expect(rooms[0].receive).toHaveBeenCalledOnce();
    });

    it('moves a socket that joins again to its new game', () => {
        const { h, rooms } = host();
        h.join('a', 's1', 'Ana', vi.fn());
        h.join('a', 's2', 'Ana', vi.fn());
        expect(rooms[0].stop).toHaveBeenCalledOnce();
        expect(rooms[1].connect).toHaveBeenCalledOnce();
    });

    it('starts the game for the whole session', () => {
        expect(startAirHockeyGame({ game: 'airhockey', step: 'lobby' }, 42)).toEqual({ game: 'airhockey', step: 'play', roundStartedAt: 42 });
    });

    it('copies the bytes of a view, keeps an ArrayBuffer, refuses the rest', () => {
        const b = new ArrayBuffer(3);
        expect(toArrayBuffer(b)).toBe(b);
        expect(toArrayBuffer(new Uint8Array([1, 2, 3]).subarray(1)).byteLength).toBe(2);
        expect(toArrayBuffer('x')).toBeNull();
    });
});
