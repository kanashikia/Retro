import React, { useEffect, useRef, useState } from 'react';
import { SessionState, User } from '../../types';
import { getGameMeta } from '../../icebreaker/games';
import { airHockeySocket } from '../../icebreaker/airHockeySocket';
import { socket } from '../../services/socket';
import { AlertCircle, LogOut, Shuffle, Trophy } from 'lucide-react';
import { GameLobby } from './shared';

interface Props {
  session: SessionState;
  currentUser: User;
  participants: User[];
  isAdmin: boolean;
  isStarting: boolean;
  onStart: () => void;
  onStartRetro: () => void;
  onChangeGame: () => void;
  /** The board's last error: the board header, which shows it otherwise, is hidden while the game is on. */
  error?: string | null;
  /** Leave the session (the admin closes it): the board header's Leave is hidden while the game is on. */
  onLeave?: () => void;
}

const META = getGameMeta('airhockey')!;

/**
 * The rink: the game is loaded on demand, in its own chunk, and mounted in its own Shadow DOM.
 * Remounted after a reconnect, since the server drops a socket's game when it goes.
 */
const Rink: React.FC<{ sessionId: string; name: string }> = ({ sessionId, name }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const again = () => setEpoch(e => e + 1);
    socket.on('connect', again);
    return () => { socket.off('connect', again); };
  }, []);

  useEffect(() => {
    let game: { destroy(): void } | undefined;
    let gone = false;
    import('air-hockey')
      .then(({ airHockey }) => {
        if (gone || !ref.current) return;
        game = airHockey(ref.current, { name, socket: airHockeySocket(socket, sessionId), fill: true });
        setStatus('ready');
      })
      .catch(() => !gone && setStatus('failed'));
    return () => {
      gone = true;
      game?.destroy();
    };
  }, [sessionId, name, epoch]);

  return (
    <div className="ah-rink">
      {status === 'loading' && <p className="absolute inset-0 flex items-center justify-center text-text-muted italic text-center px-4">Flooding the rink...</p>}
      {status === 'failed' && <p className="absolute inset-0 flex items-center justify-center text-text-muted text-center px-4">The game did not load. Check your connection and reload the page.</p>}
      <div ref={ref} className="h-full" />
    </div>
  );
};

const AirHockeyGame: React.FC<Props> = ({
  session, currentUser, participants, isAdmin, isStarting, onStart, onStartRetro, onChangeGame, error, onLeave
}) => {
  if (session.iceBreakerState?.step !== 'play') {
    return (
      <GameLobby
        meta={META}
        description="Everyone plays at once, split in two teams. Three short rounds, first to 3 goals: ice, sea, then desert. Steer your paddle with the mouse or a finger."
        startingLabel="Opening the rink..."
        participants={participants}
        isAdmin={isAdmin}
        isStarting={isStarting}
        onStart={onStart}
        onChangeGame={onChangeGame}
      />
    );
  }

  // 44 px tall on a phone, the touch target size; slimmer from `sm` up.
  const tap = 'min-h-11 sm:min-h-9';
  return (
    // A bar above the rink, one line when it fits and wrapping when it does not (a phone, a big
    // zoom): the admin's buttons and Leave stay reachable. The rink gets every other pixel of height.
    <div className="ah-play flex flex-col gap-2 w-full">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 w-full min-h-10">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 px-3 py-1 rounded-full text-xs font-black uppercase tracking-[0.2em]" style={{ background: `${META.color}22`, color: META.color }}>
            {META.emoji} {META.name}
          </span>
          <span className="hidden sm:block text-text-muted text-sm truncate">Three rounds, first to 3 goals. Your paddle follows the mouse or a finger. 🔊 on the first click.</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
          {isAdmin ? (
            <>
              <button onClick={onChangeGame} className={`${tap} flex items-center gap-1.5 px-2 text-sm font-bold text-text-muted hover:text-text transition-colors`}>
                <Shuffle className="w-4 h-4" /> Play another game
              </button>
              <button onClick={onStartRetro} className={`${tap} flex items-center gap-2 px-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 active:scale-[0.98]`}>
                <Trophy className="w-4 h-4" /> Start Retro
              </button>
            </>
          ) : (
            <p className="text-text-muted italic text-sm">Waiting for the admin to start the retro...</p>
          )}
          {onLeave && (
            <button onClick={onLeave} title="Leave session" aria-label="Leave session" className={`${tap} min-w-11 sm:min-w-9 flex items-center justify-center rounded-xl text-red-600 hover:bg-red-50 transition-colors`}>
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="w-full flex items-center gap-2 text-red-600 text-sm font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </p>
        )}
      </div>
      <Rink sessionId={session.id} name={currentUser.name} />
    </div>
  );
};

export default AirHockeyGame;
