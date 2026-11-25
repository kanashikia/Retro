import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { SessionState, User } from '../../types';
import { DEFAULT_FPS_MAP, FPS_MAPS, getGameMeta } from '../../icebreaker/games';
import { socket } from '../../services/socket';
import { EndOfGameActions, GameHeader, GameLobby } from './shared';

interface Props {
  session: SessionState;
  participants: User[];
  isAdmin: boolean;
  isStarting: boolean;
  onStart: () => void;
  onStartRetro: () => void;
  onChangeGame: () => void;
}

const META = getGameMeta('tinyfps')!;
const mapOf = (id: string | undefined) => FPS_MAPS.find(m => m.id === id) ?? FPS_MAPS.find(m => m.id === DEFAULT_FPS_MAP)!;

/** The admin picks the map; everyone else sees the pick. */
const MapPicker: React.FC<{ sessionId: string; picked: string; isAdmin: boolean; disabled: boolean }> = ({ sessionId, picked, isAdmin, disabled }) => (
  <div className="w-full max-w-2xl space-y-2">
    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">{isAdmin ? 'Pick the map' : 'Map'}</p>
    <div role="radiogroup" aria-label="Map" className="grid gap-2 sm:grid-cols-3">
      {FPS_MAPS.map(m => {
        const on = m.id === picked;
        return (
          <button
            key={m.id}
            role="radio"
            aria-checked={on}
            disabled={!isAdmin || disabled}
            onClick={() => !on && socket.emit('tinyfps:map', { sessionId, map: m.id })}
            className={`min-h-[44px] rounded-2xl border-2 p-3 text-left transition-all ${on ? '' : 'border-border'} ${isAdmin ? 'hover:border-text-muted' : 'cursor-default'} disabled:opacity-100 ${!on && !isAdmin ? 'opacity-50' : ''}`}
            style={on ? { borderColor: META.color, background: `${META.color}14` } : undefined}
          >
            <span className="block font-bold text-text">{m.name}</span>
            <span className="block text-xs font-semibold" style={{ color: META.color }}>{m.tag}</span>
            <span className="block text-xs text-text-muted mt-1">{m.blurb}</span>
          </button>
        );
      })}
    </div>
  </div>
);

/**
 * The game runs in a tab of its own, full screen. The ticket asked for here lets that tab into the
 * session's game under this player's name, without joining the retro session a second time.
 */
const OpenGame: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [ticket, setTicket] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let gone = false;
    const ask = () =>
      socket.emit('tinyfps:ticket', { sessionId }, (res: { ticket?: string; error?: string } | undefined) => {
        if (gone) return;
        if (res?.ticket) setTicket(res.ticket);
        else setFailed(true);
      });
    ask();
    socket.on('connect', ask);
    return () => {
      gone = true;
      socket.off('connect', ask);
    };
  }, [sessionId]);

  // Opened from the click itself, or the browser blocks the tab.
  const open = () => ticket && window.open(`/fps.html#t=${encodeURIComponent(ticket)}`, '_blank', 'noopener');

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={open}
        disabled={!ticket}
        className="flex items-center gap-2 px-8 py-4 text-white font-bold rounded-2xl transition-all disabled:opacity-50 text-lg shadow-lg active:scale-[0.98]"
        style={{ background: META.color, boxShadow: `0 10px 30px -10px ${META.color}` }}
      >
        <ExternalLink className="w-5 h-5" /> Open the game
      </button>
      <p className="text-xs text-text-muted max-w-sm text-center">
        {failed
          ? 'Could not get you in. Reload the page and try again.'
          : 'It opens full screen in a new tab: pick your character, then Start. Come back here when you are done.'}
      </p>
    </div>
  );
};

const TinyFpsGame: React.FC<Props> = ({ session, participants, isAdmin, isStarting, onStart, onStartRetro, onChangeGame }) => {
  const state = session.iceBreakerState;
  const map = mapOf(state?.fpsMap);

  if (state?.step !== 'play') {
    return (
      <GameLobby
        meta={META}
        description="Two teams, one flag each: take theirs home, keep yours. Played with mouse and keyboard, full screen in a new tab, everyone in the same match."
        startingLabel="Opening the game..."
        participants={participants}
        isAdmin={isAdmin}
        isStarting={isStarting}
        onStart={onStart}
        onChangeGame={onChangeGame}
      >
        <MapPicker sessionId={session.id} picked={map.id} isAdmin={isAdmin} disabled={isStarting} />
      </GameLobby>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <GameHeader emoji={META.emoji} name={META.name} color={META.color} subtitle={`${map.name}: capture the flag, up to 16 players. Mouse and keyboard.`} />
      <OpenGame sessionId={session.id} />
      <EndOfGameActions isAdmin={isAdmin} onStartRetro={onStartRetro} onChangeGame={onChangeGame} />
    </div>
  );
};

export default TinyFpsGame;
