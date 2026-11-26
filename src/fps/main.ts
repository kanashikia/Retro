// The Tiny FPS tab, opened from the retro's ice breaker (TinyFpsGame.tsx). No React, no app shell:
// the socket, the game loaded on demand, and a line of text when something goes wrong.
import { socket } from '../services/socket';
import { fpsSocket, joinFps } from './fpsSocket';

/** The ticket rides in the hash (never sent to a server), then stays in this tab for a reload. */
const TICKET_KEY = 'retro_fps_ticket';

const readTicket = (): string | null => {
  const fromHash = new URLSearchParams(location.hash.slice(1)).get('t');
  if (fromHash) {
    try { sessionStorage.setItem(TICKET_KEY, fromHash); } catch { /* private mode: the hash only */ }
    history.replaceState(null, '', location.pathname);
    return fromHash;
  }
  try { return sessionStorage.getItem(TICKET_KEY); } catch { return null; }
};

const el = document.getElementById('game')!;
const msg = document.getElementById('msg')!;
const say = (text: string | null) => {
  msg.hidden = text === null;
  msg.textContent = text ?? '';
};

const ticket = readTicket();
let game: { destroy(): void } | undefined;
/** The character screen opens the first time only; after a reconnect the player is back at once. */
let started = false;
/** Sent off by the server: the game is over for this tab, no rejoining on reconnect. */
let off = false;

/** Why the server sent this tab off: the retro moved on, or the player joined from another tab. */
const OVER: Record<string, string> = {
  ended: 'The game is over. Go back to the retro.',
  elsewhere: 'You joined the game from another tab. You can close this one.',
};

const mount = async () => {
  if (off) return;
  try {
    const [{ name, map }, { tinyFps }] = await Promise.all([joinFps(socket, ticket!), import('@korial29/tiny-fps')]);
    // Sent off while the game loaded.
    if (off) return;
    game?.destroy();
    const g = tinyFps(el, { name, map, socket: fpsSocket(socket), cast: !started, voices: false });
    game = g;
    g.on('start', () => {
      started = true;
      document.documentElement.requestFullscreen?.().catch(() => {});
    });
    g.on('quit', () => {
      g.destroy();
      window.close();
      say('You left the game. You can close this tab.');
    });
    say(null);
  } catch (e) {
    say(
      (e as Error).message === 'No game running'
        ? 'The game is over or has not started. Go back to the retro.'
        : 'The game did not load. Go back to the retro and open it again.',
    );
  }
};

if (!ticket) {
  say('Open Tiny FPS from your retro.');
} else {
  void mount();
  // The server drops a socket's player when it goes: back in on reconnect.
  socket.on('disconnect', () => off || say('Connection lost, reconnecting...'));
  socket.io.on('reconnect', () => void mount());
  socket.on('tinyfps:over', ({ reason }: { reason?: string } = {}) => {
    off = true;
    game?.destroy();
    game = undefined;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    say(OVER[reason ?? ''] ?? OVER.ended);
  });
}
