import { describe, it, expect, vi, afterEach } from 'vitest';
import { airHockeySocket } from './airHockeySocket';

/** A Socket.io client that records emits and lets the test fire events and acks. */
const fakeIo = () => {
  const handlers = new Map<string, Set<(...a: any[]) => void>>();
  const emits: any[][] = [];
  const io = {
    emits,
    on: (e: string, h: any) => { if (!handlers.has(e)) handlers.set(e, new Set()); handlers.get(e)!.add(h); return io; },
    off: (e: string, h: any) => { handlers.get(e)?.delete(h); return io; },
    emit: (...a: any[]) => { emits.push(a); return io; },
    fire: (e: string, ...a: any[]) => handlers.get(e)?.forEach(h => h(...a)),
    ack: (i: number, res: any) => emits[i][2](res),
  };
  return io;
};

afterEach(() => vi.useRealTimers());

describe('airHockeySocket', () => {
  it('joins the session game, opens on the ack, relays frames both ways', () => {
    const io = fakeIo();
    const s = airHockeySocket(io as any, 's1');
    s.onopen = vi.fn();
    s.onmessage = vi.fn();
    expect(io.emits[0].slice(0, 2)).toEqual(['airhockey:join', { sessionId: 's1' }]);
    io.ack(0, { success: true });
    expect(s.onopen).toHaveBeenCalledOnce();
    s.send('{"t":"join","name":"Ana"}');
    expect(io.emits[1]).toEqual(['airhockey:frame', '{"t":"join","name":"Ana"}']);
    // Binary as a view: handed over as an ArrayBuffer of its bytes.
    io.fire('airhockey:frame', new Uint8Array([0, 1, 2, 3]).subarray(1));
    const { data } = (s.onmessage as any).mock.calls[0][0];
    expect(data).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(data)]).toEqual([1, 2, 3]);
    s.close();
    expect(io.emits.at(-1)).toEqual(['airhockey:leave']);
    io.fire('airhockey:frame', 'late');
    s.send('late');
    expect((s.onmessage as any).mock.calls).toHaveLength(1);
    expect(io.emits.filter(e => e[0] === 'airhockey:frame')).toHaveLength(1);
  });

  it('retries a refused join a few times (the session rejoin may still be on its way), then closes', () => {
    vi.useFakeTimers();
    const io = fakeIo();
    const s = airHockeySocket(io as any, 's1');
    s.onclose = vi.fn();
    for (let i = 0; i < 5; i++) {
      io.ack(io.emits.length - 1, { error: 'Missing actor' });
      vi.advanceTimersByTime(500);
    }
    expect(io.emits.filter(e => e[0] === 'airhockey:join')).toHaveLength(5);
    expect(s.onclose).toHaveBeenCalledOnce();
  });

  it('closes when the connection drops', () => {
    const io = fakeIo();
    const s = airHockeySocket(io as any, 's1');
    s.onclose = vi.fn();
    io.fire('disconnect');
    io.fire('disconnect');
    expect(s.onclose).toHaveBeenCalledOnce();
  });
});
