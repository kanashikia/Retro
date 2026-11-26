import { describe, it, expect, vi } from 'vitest';
import {
    DEFAULT_FPS_MAP, FPS_MAPS, MAX_FPS_FRAME, cleanFpsText, createTinyFpsHost, isFpsMap, isFpsOn,
    signFpsTicket, startTinyFpsGame, verifyFpsTicket,
} from './tinyFps.js';

const fakeRoom = () => ({ start: vi.fn(), stop: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), receive: vi.fn(), size: 0 });

const host = () => {
    const rooms = [];
    const h = createTinyFpsHost({ makeRoom: (rules) => { const r = { ...fakeRoom(), rules }; rooms.push(r); return r; } });
    return { h, rooms };
};

describe('tiny fps host', () => {
    it('opens one locked room per session and map, and closes it with its last player', () => {
        const { h, rooms } = host();
        h.join('a', 's1', 'tranquility', 'Ana', vi.fn());
        h.join('b', 's1', 'tranquility', 'Bob', vi.fn());
        h.join('c', 's1', 'highline', 'Chloé', vi.fn());
        expect(rooms).toHaveLength(2);
        expect(rooms[0].rules).toEqual({ map: 'tranquility', lockMap: true });
        expect(rooms[0].start).toHaveBeenCalledOnce();
        h.leave('a');
        expect(rooms[0].stop).not.toHaveBeenCalled();
        h.leave('b');
        h.leave('b');
        expect(rooms[0].disconnect).toHaveBeenCalledTimes(2);
        expect(rooms[0].stop).toHaveBeenCalledOnce();
        expect(rooms[1].stop).not.toHaveBeenCalled();
    });

    it("joins under the session's name and keeps the character picked, nothing else", () => {
        const { h, rooms } = host();
        h.join('a', 's1', 'highline', 'A name far too long for the game', vi.fn());
        h.receive('a', JSON.stringify({ t: 'join', name: 'Hacker', body: 1, role: 2, tone: 'x' }));
        h.receive('a', JSON.stringify({ t: 'map', map: 'landfall' }));
        h.receive('a', JSON.stringify({ t: 'watch', id: 3 }));
        h.receive('a', JSON.stringify({ t: 'body', body: 0, hair: 2 }));
        h.receive('a', 'not json');
        const texts = rooms[0].receive.mock.calls.map(([, d]) => JSON.parse(d));
        expect(texts).toEqual([
            { t: 'join', name: 'A name far too l', body: 1, role: 2 },
            { t: 'body', body: 0, hair: 2 },
        ]);
    });

    it('passes inputs as exact ArrayBuffers and drops oversized frames or strangers', () => {
        const { h, rooms } = host();
        h.receive('nobody', new ArrayBuffer(12));
        h.join('a', 's1', 'highline', 'Ana', vi.fn());
        const pool = Buffer.alloc(64);
        h.receive('a', pool.subarray(4, 16));
        h.receive('a', new ArrayBuffer(MAX_FPS_FRAME + 1));
        h.receive('a', 'x'.repeat(MAX_FPS_FRAME + 1));
        expect(rooms[0].receive).toHaveBeenCalledOnce();
        expect(rooms[0].receive.mock.calls[0][1].byteLength).toBe(12);
    });
});

describe('tiny fps host: sending tabs off', () => {
    it("ends a session's games when it moves on: every tab told, its rooms stopped, other sessions kept", () => {
        const { h, rooms } = host();
        const over = { a: vi.fn(), b: vi.fn(), c: vi.fn() };
        h.join('a', 's1', 'highline', 'Ana', vi.fn(), { userId: 'u1', over: over.a });
        h.join('b', 's1', 'highline', 'Bob', vi.fn(), { userId: 'u2', over: over.b });
        h.join('c', 's2', 'highline', 'Chloé', vi.fn(), { userId: 'u3', over: over.c });
        h.end('s1');
        expect(over.a).toHaveBeenCalledWith('ended');
        expect(over.b).toHaveBeenCalledWith('ended');
        expect(over.c).not.toHaveBeenCalled();
        expect(rooms[0].stop).toHaveBeenCalledOnce();
        expect(rooms[1].stop).not.toHaveBeenCalled();
        expect(h.size('s1', 'highline')).toBe(0);
        // Gone from the host: their frames and leaves do nothing, a second end neither.
        h.receive('a', new ArrayBuffer(12));
        expect(rooms[0].receive).not.toHaveBeenCalled();
        h.end('s1');
        expect(over.a).toHaveBeenCalledOnce();
    });

    it('keeps one player per user in a session: a new tab takes the place, the older one is sent off', () => {
        const { h, rooms } = host();
        const first = vi.fn();
        const second = vi.fn();
        h.join('tab1', 's1', 'highline', 'Ana', vi.fn(), { userId: 'u1', over: first });
        h.join('bob', 's1', 'highline', 'Bob', vi.fn(), { userId: 'u2', over: vi.fn() });
        h.join('tab2', 's1', 'highline', 'Ana', vi.fn(), { userId: 'u1', over: second });
        expect(first).toHaveBeenCalledWith('elsewhere');
        expect(second).not.toHaveBeenCalled();
        expect(rooms).toHaveLength(1);
        expect(rooms[0].disconnect).toHaveBeenCalledOnce();
        expect(rooms[0].connect).toHaveBeenCalledTimes(3);
        expect(rooms[0].stop).not.toHaveBeenCalled();
        // Another session of the same user is another game.
        const other = vi.fn();
        h.join('tab3', 's2', 'highline', 'Ana', vi.fn(), { userId: 'u1', over: other });
        expect(second).not.toHaveBeenCalled();
    });
});

describe('tiny fps state and tickets', () => {
    it('knows the maps of the game, not the prototype', () => {
        expect(FPS_MAPS).toEqual(expect.arrayContaining(['highline', 'tranquility', 'landfall']));
        expect(isFpsMap('__proto__')).toBe(false);
        expect(isFpsMap(7)).toBe(false);
    });

    it('knows when a game is on: the ice breaker, Tiny FPS, started, the session open', () => {
        const on = { phase: 'ICE_BREAKER', iceBreakerState: { game: 'tinyfps', step: 'play' } };
        expect(isFpsOn(on, 'active')).toBe(true);
        expect(isFpsOn(on, undefined)).toBe(true);
        expect(isFpsOn(on, 'closed')).toBe(false);
        expect(isFpsOn({ ...on, phase: 'BRAINSTORM' }, 'active')).toBe(false);
        expect(isFpsOn({ ...on, iceBreakerState: { game: 'airhockey', step: 'play' } }, 'active')).toBe(false);
        expect(isFpsOn({ ...on, iceBreakerState: { game: 'tinyfps', step: 'lobby' } }, 'active')).toBe(false);
        expect(isFpsOn(undefined, 'active')).toBe(false);
    });

    it('starts on the map the admin picked, or the default one', () => {
        expect(startTinyFpsGame({ fpsMap: 'landfall' }, 5)).toEqual({ fpsMap: 'landfall', step: 'play', roundStartedAt: 5 });
        expect(startTinyFpsGame({ fpsMap: 'nowhere' }, 5).fpsMap).toBe(DEFAULT_FPS_MAP);
    });

    it('signs a ticket for the session and name, refused with another secret or type', () => {
        const ticket = signFpsTicket({ sessionId: 's1', user: { id: 7, name: '  Ana  ' } }, 'secret');
        expect(verifyFpsTicket(ticket, 'secret')).toEqual({ sessionId: 's1', userId: '7', name: 'Ana' });
        expect(verifyFpsTicket(ticket, 'other')).toBeNull();
        expect(verifyFpsTicket(undefined, 'secret')).toBeNull();
        expect(cleanFpsText('{"t":"join"}', 'Ana')).toBe('{"t":"join","name":"Ana"}');
    });
});
