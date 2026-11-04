import React, { useEffect, useState } from 'react';
import { ChevronRight, Eye, Play, Shuffle, SkipForward, Trophy, Users } from 'lucide-react';
import { User } from '../../types';
import { IceBreakerGameMeta } from '../../icebreaker/games';

export const MEDALS = ['🥇', '🥈', '🥉'];

export const useCountdown = (startedAt: number | undefined, seconds: number) => {
  const compute = () => (startedAt ? Math.max(0, Math.ceil((startedAt + seconds * 1000 - Date.now()) / 1000)) : seconds);
  const [remaining, setRemaining] = useState(compute);
  useEffect(() => {
    setRemaining(compute());
    const id = setInterval(() => setRemaining(compute()), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, seconds]);
  return remaining;
};

export const CountdownRing: React.FC<{ remaining: number; total: number; color: string }> = ({ remaining, total, color }) => {
  const r = 22;
  const c = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(1, remaining / total));
  const urgent = remaining <= 10;
  return (
    <div className={`relative w-16 h-16 ${urgent && remaining > 0 ? 'ib-shake' : ''}`} role="timer" aria-label={`${remaining} seconds left`}>
      <svg viewBox="0 0 56 56" className="w-16 h-16 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-border)" strokeWidth="5" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke={urgent ? '#ef4444' : color}
          strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s' }}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-black text-lg ${urgent ? 'text-red-500' : 'text-text'}`}>
        {remaining}
      </span>
    </div>
  );
};

export interface LeaderboardRow { id: string; name: string; score: number }

export const Leaderboard: React.FC<{ rows: LeaderboardRow[]; color: string; highlightId?: string; title?: string; unit?: string }> = ({
  rows, color, highlightId, title = 'Leaderboard', unit = 'pts'
}) => (
  <div className="bg-surface border border-border rounded-2xl p-5 w-full max-w-xl">
    <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-3">{title}</p>
    <ol className="space-y-2">
      {rows.map((row, i) => (
        <li
          key={row.id}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 ${row.id === highlightId ? 'bg-primary/10' : ''}`}
        >
          <span className="w-7 text-center text-lg">{i === 0 && row.score > 0 ? '👑' : <span className="text-sm font-black text-text-muted">{i + 1}</span>}</span>
          <span className="flex-1 font-bold text-text truncate">{row.name}</span>
          <span className="font-black tabular-nums" style={{ color }}>{row.score} {unit}</span>
        </li>
      ))}
    </ol>
  </div>
);

// Header pill shared by the games: emoji + name, and a subtitle (round, step).
// Top-level on purpose: a component defined inside a render would remount on
// every countdown tick and restart its entrance animation.
export const GameHeader: React.FC<{ emoji: string; name: string; color: string; subtitle: string }> = ({ emoji, name, color, subtitle }) => (
  <div className="text-center space-y-2 ib-fade-up">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-[0.2em]" style={{ background: `${color}22`, color }}>
      {emoji} {name}
    </div>
    <p className="text-text-muted text-sm">{subtitle}</p>
  </div>
);

export const PlayersPanel: React.FC<{ participants: User[]; emptyText?: string; children?: React.ReactNode }> = ({ participants, emptyText, children }) => (
  <div className="bg-surface border border-border rounded-2xl p-5 w-full max-w-md space-y-3 text-left">
    <h3 className="font-bold text-text flex items-center gap-2">
      <Users className="w-5 h-5 text-primary" /> Players ({participants.length})
    </h3>
    {participants.length === 0 && emptyText ? (
      <p className="text-text-muted text-sm italic">{emptyText}</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {participants.map(p => (
          <span key={p.id} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold">{p.name}</span>
        ))}
      </div>
    )}
    {children}
  </div>
);

const linkButton = 'flex items-center gap-1.5 text-sm font-bold text-text-muted hover:text-text transition-colors';

export const GameLobby: React.FC<{
  meta: IceBreakerGameMeta;
  description: string;
  participants: User[];
  isAdmin: boolean;
  isStarting: boolean;
  startingLabel: string;
  minPlayers?: number;
  onStart: () => void;
  onChangeGame: () => void;
}> = ({ meta, description, participants, isAdmin, isStarting, startingLabel, minPlayers = 1, onStart, onChangeGame }) => {
  const enough = participants.length >= minPlayers;
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center">
      <div className="space-y-3 ib-fade-up">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-4xl ib-float" style={{ background: `${meta.color}22` }}>
          {meta.emoji}
        </div>
        <h2 className="text-3xl font-black text-text">{meta.name}</h2>
        <p className="text-text-muted max-w-md mx-auto leading-relaxed">{description}</p>
      </div>

      <PlayersPanel participants={participants}>
        {minPlayers > 1 && !enough && <p className="text-xs text-text-muted italic">{meta.name} needs at least {minPlayers} players.</p>}
      </PlayersPanel>

      {isAdmin ? (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onStart}
            disabled={isStarting || !enough}
            className="flex items-center gap-2 px-8 py-4 text-white font-bold rounded-2xl transition-all disabled:opacity-50 text-lg shadow-lg active:scale-[0.98]"
            style={{ background: meta.color, boxShadow: `0 10px 30px -10px ${meta.color}` }}
          >
            <Play className="w-5 h-5" />
            {isStarting ? startingLabel : 'Start the game'}
          </button>
          <button onClick={onChangeGame} disabled={isStarting} className={`${linkButton} disabled:opacity-50`}>
            <Shuffle className="w-4 h-4" /> Change game
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-text-muted">
          <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
          <span className="italic">Waiting for the admin to start...</span>
        </div>
      )}
    </div>
  );
};

/** Admin links under an open round: close it now, swap its item for a spare, or leave the game. */
export const AdminRoundControls: React.FC<{
  isAdmin: boolean;
  revealLabel: string;
  skipLabel: string;
  onAdvance: () => void;
  onSkip: () => void;
  onChangeGame: () => void;
}> = ({ isAdmin, revealLabel, skipLabel, onAdvance, onSkip, onChangeGame }) => {
  if (!isAdmin) return null;
  return (
    <div className="flex items-center gap-6">
      <button onClick={onAdvance} className={linkButton}>
        <Eye className="w-4 h-4" /> {revealLabel}
      </button>
      <button onClick={onSkip} className={linkButton}>
        <SkipForward className="w-4 h-4" /> {skipLabel}
      </button>
      <button onClick={onChangeGame} className={linkButton}>
        <Shuffle className="w-4 h-4" /> Change game
      </button>
    </div>
  );
};

export const NextRoundButton: React.FC<{
  isAdmin: boolean;
  color: string;
  isLast: boolean;
  nextLabel: string;
  onAdvance: () => void;
}> = ({ isAdmin, color, isLast, nextLabel, onAdvance }) => (
  isAdmin ? (
    <button
      onClick={onAdvance}
      className="flex items-center gap-2 px-8 py-4 text-white font-bold rounded-2xl transition-all text-lg shadow-lg active:scale-[0.98]"
      style={{ background: color, boxShadow: `0 10px 30px -10px ${color}` }}
    >
      {isLast ? <><Trophy className="w-5 h-5" /> See final results</> : <>{nextLabel} <ChevronRight className="w-5 h-5" /></>}
    </button>
  ) : (
    <p className="text-text-muted italic text-sm">Waiting for the admin...</p>
  )
);

export const EndOfGameActions: React.FC<{
  isAdmin: boolean;
  onStartRetro: () => void;
  onChangeGame: () => void;
}> = ({ isAdmin, onStartRetro, onChangeGame }) => (
  isAdmin ? (
    <div className="flex flex-col items-center gap-3">
      <button onClick={onStartRetro} className="flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-hover transition-all text-lg shadow-lg shadow-primary/20 active:scale-[0.98]">
        <Trophy className="w-5 h-5" /> Start Retro
      </button>
      <button onClick={onChangeGame} className={linkButton}>
        <Shuffle className="w-4 h-4" /> Play another game
      </button>
    </div>
  ) : (
    <p className="text-text-muted italic text-sm">Waiting for the admin to start the retro...</p>
  )
);

/** One chip per player, green once they have answered this step. */
export const PlayerChips: React.FC<{ players: User[]; isDone: (player: User) => boolean }> = ({ players, isDone }) => (
  <div className="flex flex-wrap justify-center gap-2 max-w-xl">
    {players.map(p => (
      <span key={p.id} className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${isDone(p) ? 'bg-emerald-500/15 text-emerald-600' : 'bg-secondary text-text-muted'}`}>
        {isDone(p) ? '✓ ' : '… '}{p.name}
      </span>
    ))}
  </div>
);
