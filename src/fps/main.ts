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

const mount = async () => {
  try {
    const [{ name, map }, { tinyFps }] = await Promise.all([joinFps(socket, ticket!), import('@korial29/tiny-fps')]);
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
  socket.on('disconnect', () => say('Connection lost, reconnecting...'));
  socket.io.on('reconnect', () => void mount());
}
