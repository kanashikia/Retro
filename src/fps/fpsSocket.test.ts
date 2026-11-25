import { describe, expect, it, vi } from 'vitest';
import { fpsSocket, joinFps } from './fpsSocket';

/** A Socket.io client stand-in: handlers by event, emits recorded, acks answered by `answer`. */
const fakeIo = (answer: (ev: string, payload: unknown) => unknown = () => undefined) => {
  const handlers = new Map<string, Set<(...a: any[]) => void>>();
  const io = {
    connected: true,
    on: vi.fn((ev: string, h: (...a: any[]) => void) => void (handlers.get(ev) ?? handlers.set(ev, new Set()).get(ev)!).add(h)),
    once: vi.fn((ev: string, h: (...a: any[]) => void) => io.on(ev, h)),
    off: vi.fn((ev: string, h: (...a: any[]) => void) => void handlers.get(ev)?.delete(h)),
    emit: vi.fn((ev: string, payload?: unknown, ack?: (r: unknown) => void) => ack?.(answer(ev, payload))),
    fire: (ev: string, ...a: unknown[]) => handlers.get(ev)?.forEach(h => h(...a)),
  };
  return io;
};

describe('joinFps', () => {
  it('joins with the ticket and gets the name and map from the server', async () => {
    const io = fakeIo(() => ({ name: 'Ana', map: 'landfall' }));
    await expect(joinFps(io as any, 't1')).resolves.toEqual({ name: 'Ana', map: 'landfall' });
    expect(io.emit).toHaveBeenCalledWith('tinyfps:join', { ticket: 't1' }, expect.any(Function));
  });

  it('fails with the server error, and waits for the connection first', async () => {
    const io = fakeIo(() => ({ error: 'No game running' }));
    io.connected = false;
    const joined = joinFps(io as any, 't1');
    expect(io.emit).not.toHaveBeenCalled();
    io.fire('connect');
    await expect(joined).rejects.toThrow('No game running');
  });
});

describe('fpsSocket', () => {
  it('opens on the next turn, delivers early frames as exact ArrayBuffers, and sends frames', async () => {
    vi.useFakeTimers();
    const io = fakeIo();
    const s = fpsSocket(io as any);
    const got: unknown[] = [];
    const open = vi.fn();
    const pool = new Uint8Array(32);
    io.fire('tinyfps:frame', '{"t":"roster"}');
    io.fire('tinyfps:frame', pool.subarray(4, 16));
    s.onopen = open;
    s.onmessage = ev => got.push(ev.data);
    vi.runAllTimers();
    expect(open).toHaveBeenCalledOnce();
    expect(got[0]).toBe('{"t":"roster"}');
    expect((got[1] as ArrayBuffer).byteLength).toBe(12);
    s.send('{"t":"join"}');
    expect(io.emit).toHaveBeenCalledWith('tinyfps:frame', '{"t":"join"}');
    vi.useRealTimers();
  });

  it('closes on a drop, and leaves when the game closes it', () => {
    const io = fakeIo();
    const s = fpsSocket(io as any);
    const closed = vi.fn();
    s.onclose = closed;
    io.fire('disconnect');
    expect(closed).toHaveBeenCalledOnce();
    s.send('x');
    expect(io.emit).not.toHaveBeenCalledWith('tinyfps:frame', 'x');

    const t = fpsSocket(io as any);
    t.close();
    t.close();
    expect(io.emit.mock.calls.filter(([ev]) => ev === 'tinyfps:leave')).toHaveLength(1);
  });
});
