import type { Socket } from 'socket.io-client';
// Type only: the game stays in its own chunk.
import type { SocketLike } from '@korial29/tiny-fps';

export interface FpsJoin {
  name: string;
  map: string;
}

/** Joins the session's running game with the ticket the retro tab handed over. */
export const joinFps = (io: Socket, ticket: string): Promise<FpsJoin> =>
  new Promise((resolve, reject) => {
    const go = () =>
      io.emit('tinyfps:join', { ticket }, (res: (FpsJoin & { error?: string }) | undefined) =>
        res && !res.error ? resolve({ name: res.name, map: res.map }) : reject(new Error(res?.error ?? 'No answer')),
      );
    if (io.connected) go();
    else io.once('connect', go);
  });

/**
 * The game's socket over Socket.io, once joinFps() let us in: frames go both ways on
 * 'tinyfps:frame'. Opens right after the game took it, keeps what arrives before the game listens,
 * closes when the connection drops.
 */
export const fpsSocket = (io: Socket): SocketLike => {
  let closed = false;
  const early: (string | ArrayBuffer)[] = [];
  const s: SocketLike = {
    binaryType: 'arraybuffer',
    onopen: null,
    onclose: null,
    onmessage: null,
    send: data => {
      if (!closed) io.emit('tinyfps:frame', data);
    },
    close: () => {
      if (closed) return;
      shut();
      io.emit('tinyfps:leave');
    },
  };
  const onFrame = (raw: string | ArrayBuffer | ArrayBufferView) => {
    const data = ArrayBuffer.isView(raw)
      ? (raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer)
      : raw;
    if (s.onmessage) s.onmessage({ data });
    else early.push(data);
  };
  const onDrop = () => {
    if (closed) return;
    shut();
    s.onclose?.();
  };
  const shut = () => {
    closed = true;
    io.off('tinyfps:frame', onFrame);
    io.off('disconnect', onDrop);
  };
  io.on('tinyfps:frame', onFrame);
  io.on('disconnect', onDrop);
  // tinyFps() sets its handlers as it mounts: open on the next turn.
  setTimeout(() => {
    if (closed) return;
    s.onopen?.();
    early.splice(0).forEach(data => s.onmessage?.({ data }));
  }, 0);
  return s;
};
