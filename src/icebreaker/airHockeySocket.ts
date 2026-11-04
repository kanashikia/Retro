import type { Socket } from 'socket.io-client';
// Type only: the game itself stays in its own chunk, loaded when the game starts.
import type { SocketLike } from 'air-hockey';

/** Tries left to join while the socket rejoins its session after a reconnect. */
const JOIN_TRIES = 5;
const JOIN_RETRY_MS = 500;

/**
 * The game's socket over Retro's Socket.io connection: frames go both ways on 'airhockey:frame',
 * the server hosts the session's game. Opens once the server has us in, closes if it refuses
 * or the connection drops.
 */
export const airHockeySocket = (io: Socket, sessionId: string): SocketLike => {
  let closed = false;
  const s: SocketLike = {
    binaryType: 'arraybuffer',
    onopen: null,
    onclose: null,
    onmessage: null,
    send: data => {
      if (!closed) io.emit('airhockey:frame', data);
    },
    close: () => {
      if (closed) return;
      shut();
      io.emit('airhockey:leave');
    },
  };
  const onFrame = (data: string | ArrayBuffer | ArrayBufferView) =>
    s.onmessage?.({
      data: ArrayBuffer.isView(data)
        ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
        : data,
    });
  const onDrop = () => {
    if (closed) return;
    shut();
    s.onclose?.();
  };
  const shut = () => {
    closed = true;
    io.off('airhockey:frame', onFrame);
    io.off('disconnect', onDrop);
  };
  io.on('airhockey:frame', onFrame);
  io.on('disconnect', onDrop);
  const join = (left: number) =>
    !closed &&
    io.emit('airhockey:join', { sessionId }, (res: { error?: string } | undefined) => {
      if (closed) return;
      if (!res?.error) return s.onopen?.();
      if (left > 1) setTimeout(() => join(left - 1), JOIN_RETRY_MS);
      else onDrop();
    });
  join(JOIN_TRIES);
  return s;
};
