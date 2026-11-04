import React from 'react';
import { Dices, Lock, Shuffle } from 'lucide-react';
import { IceBreakerGameId, User } from '../../types';
import { GamePick, IceBreakerGameMeta, RANDOM_GAME } from '../../icebreaker/games';
import NewBadge from './NewBadge';
import { PlayersPanel } from './shared';

interface Props {
  games: IceBreakerGameMeta[];
  participants: User[];
  isAdmin: boolean;
  isSelecting: boolean;
  onSelect: (pick: GamePick) => void;
  /** Games switched out of the random wheel (admin choice, shared with everyone). */
  excluded?: IceBreakerGameId[];
}

/** Its border mixes the colors of the games still in the wheel. */
const RandomGameCard: React.FC<{ playable: IceBreakerGameMeta[]; inWheel: IceBreakerGameMeta[]; isAdmin: boolean; canRandom: boolean; onSelect: (pick: GamePick) => void }> = ({
  playable, inWheel, isAdmin, canRandom, onSelect
}) => (
    <button
      type="button"
      disabled={!isAdmin || !canRandom}
      onClick={() => onSelect(RANDOM_GAME)}
      className={`group relative w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] rounded-3xl p-[3px] text-left transition-all duration-300 ease-out
        enabled:hover:-translate-y-1 enabled:hover:shadow-2xl enabled:hover:shadow-primary/25 enabled:active:translate-y-0 enabled:active:scale-[0.99]
        disabled:cursor-default focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${canRandom && isAdmin ? 'ib-wiggle-on-hover' : ''}`}
      style={{ background: `conic-gradient(${(inWheel.length ? inWheel : playable).map(g => g.color).join(', ')}, ${(inWheel[0] ?? playable[0])?.color ?? '#6366f1'})` }}
      aria-label="Random game"
    >
      <div className="relative h-full rounded-[21px] bg-surface p-5 flex flex-col gap-3 overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-enabled:group-hover:scale-150 group-enabled:group-hover:bg-primary/20" />
        <div className="h-10 flex items-center text-primary">
          <span className="inline-flex ib-wiggle-target">
            <Shuffle className="w-9 h-9" strokeWidth={2.5} />
          </span>
        </div>
        <div>
          <p className="font-black text-text text-lg leading-tight">Random</p>
          <p className="text-sm text-text-muted mt-1 leading-snug">
            {inWheel.length === playable.length ? 'Spin the wheel. No regrets, no vetoes.' : `Spin the wheel. ${inWheel.length} of ${playable.length} games in play.`}
          </p>
        </div>
        {isAdmin && (
          <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary">
            <Dices className="w-4 h-4 transition-transform duration-300 group-enabled:group-hover:rotate-12" /> Spin it
          </span>
        )}
      </div>
    </button>
);

const GameCard: React.FC<{ game: IceBreakerGameMeta; index: number; isAdmin: boolean; isSelecting: boolean; onSelect: (pick: GamePick) => void }> = ({
  game: g, index: i, isAdmin, isSelecting, onSelect
}) => {
  const disabled = !isAdmin || !g.available || isSelecting;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(g.id)}
      className={`group relative w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] rounded-3xl p-5 text-left border-2 bg-surface overflow-hidden transition-all duration-300 ease-out ib-fade-up
        enabled:hover:-translate-y-1 enabled:hover:shadow-2xl enabled:active:translate-y-0 enabled:active:scale-[0.99]
        disabled:cursor-default focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40
        ${g.available ? '' : 'opacity-60'}`}
      style={{
        borderColor: g.available ? g.color : 'var(--color-border)',
        animationDelay: `${(i + 1) * 70}ms`,
        boxShadow: g.available ? `0 10px 30px -14px ${g.color}` : undefined,
      }}
      aria-label={`${g.name}${g.available ? '' : ' (coming soon)'}`}
    >
      <div
        className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl transition-transform duration-500 group-enabled:group-hover:scale-150"
        style={{ background: g.color, opacity: 0.18 }}
      />
      {!g.available && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-secondary text-text-muted">
          <Lock className="w-3 h-3" /> Soon
        </span>
      )}
      {g.available && g.isNew && <NewBadge position="inside" color="#ef4444" />}
      <div className="relative flex flex-col gap-3 h-full">
        <div className="h-10 flex items-center">
          <span className="inline-block text-4xl leading-none origin-center transition-transform duration-300 ease-out group-enabled:group-hover:scale-110 group-enabled:group-hover:-rotate-6">
            {g.emoji}
          </span>
        </div>
        <div>
          <p className="font-black text-text text-lg leading-tight">{g.name}</p>
          <p className="text-sm text-text-muted mt-1 leading-snug">{g.tagline}</p>
        </div>
        {isAdmin && g.available && (
          <span className="mt-auto inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider" style={{ color: g.color }}>
            Play this
            <span className="inline-block transition-transform duration-300 group-enabled:group-hover:translate-x-1">→</span>
          </span>
        )}
      </div>
      {!isAdmin && g.available && <div className="absolute inset-0 ib-shimmer pointer-events-none" />}
    </button>
  );
};

const GameSelect: React.FC<Props> = ({ games, participants, isAdmin, isSelecting, onSelect, excluded = [] }) => {
  const playable = games.filter(g => g.available);
  const inWheel = playable.filter(g => !excluded.includes(g.id));
  const canRandom = playable.length > 0 && !isSelecting;

  return (
    <div className="flex flex-col items-center gap-10 py-6">
      <div className="text-center space-y-3 ib-fade-up">
        <div className="text-6xl ib-float">🕹️</div>
        <h2 className="text-4xl font-black text-text tracking-tight">Game time</h2>
        <p className="text-text-muted max-w-md mx-auto leading-relaxed">
          {isAdmin
            ? 'Pick a game to warm up the team, or let the wheel decide.'
            : 'The admin is picking a game. Stretch your fingers.'}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-5 w-full max-w-3xl">
        <RandomGameCard playable={playable} inWheel={inWheel} isAdmin={isAdmin} canRandom={canRandom} onSelect={onSelect} />

        {games.map((g, i) => (
          <GameCard key={g.id} game={g} index={i} isAdmin={isAdmin} isSelecting={isSelecting} onSelect={onSelect} />
        ))}
      </div>

      <PlayersPanel participants={participants} emptyText="Waiting for players to join..." />
    </div>
  );
};

export default GameSelect;
