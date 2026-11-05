import React, { useEffect, useRef, useState } from 'react';
import { SessionState, User } from '../../types';
import { getGameMeta } from '../../icebreaker/games';
import { airHockeySocket } from '../../icebreaker/airHockeySocket';
import { socket } from '../../services/socket';
import { EndOfGameActions, GameHeader, GameLobby } from './shared';

interface Props {
  session: SessionState;
  currentUser: User;
  participants: User[];
  isAdmin: boolean;
  isStarting: boolean;
  onStart: () => void;
  onStartRetro: () => void;
  onChangeGame: () => void;
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
        game = airHockey(ref.current, { name, socket: airHockeySocket(socket, sessionId) });
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
      {status === 'loading' && <p className="text-text-muted italic text-center py-16">Flooding the rink...</p>}
      {status === 'failed' && <p className="text-text-muted text-center py-16">The game did not load. Check your connection and reload the page.</p>}
      <div ref={ref} />
    </div>
  );
};

const AirHockeyGame: React.FC<Props> = ({
  session, currentUser, participants, isAdmin, isStarting, onStart, onStartRetro, onChangeGame
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

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <GameHeader emoji={META.emoji} name={META.name} color={META.color} subtitle="Three rounds, first to 3 goals. Mouse or finger: your paddle follows." />
      <Rink sessionId={session.id} name={currentUser.name} />
      <EndOfGameActions isAdmin={isAdmin} onStartRetro={onStartRetro} onChangeGame={onChangeGame} />
    </div>
  );
};

export default AirHockeyGame;
