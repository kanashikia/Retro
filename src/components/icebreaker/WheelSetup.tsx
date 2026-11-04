import React from 'react';
import { ArrowLeft, Dices, Plus } from 'lucide-react';
import { IceBreakerGameId } from '../../types';
import { IceBreakerGameMeta } from '../../icebreaker/games';
import WheelFace from './WheelFace';

interface Props {
  /** Every playable game. */
  games: IceBreakerGameMeta[];
  excluded: IceBreakerGameId[];
  isSpinning: boolean;
  onSetExcluded: (excluded: IceBreakerGameId[]) => void;
  onSpin: () => void;
  onBack: () => void;
}

// Admin prepares the random wheel: a click on a slice benches that game, a click
// on a benched game puts it back. Then spin.
const WheelSetup: React.FC<Props> = ({ games, excluded, isSpinning, onSetExcluded, onSpin, onBack }) => {
  const inWheel = games.filter(g => !excluded.includes(g.id));
  const benched = games.filter(g => excluded.includes(g.id));

  const bench = (id: IceBreakerGameId) => {
    if (excluded.includes(id)) return;
    onSetExcluded([...excluded, id]);
  };
  const restore = (id: IceBreakerGameId) => onSetExcluded(excluded.filter(x => x !== id));

  return (
    <div className="flex flex-col items-center gap-8 py-4 select-none">
      <div className="text-center space-y-2 ib-fade-up">
        <p className="text-xs font-black text-text-muted uppercase tracking-[0.25em]">Set up the wheel</p>
        <h2 className="text-3xl font-black text-text">Who's in?</h2>
        <p className="text-text-muted">Click a slice to bench that game. Click a benched game to put it back.</p>
      </div>

      <div className="ib-pop">
        {inWheel.length > 0 ? (
          <WheelFace games={inWheel} rotation={0} tick={0} landed={false} targetIndex={0} interactive onSegmentClick={g => bench(g.id)} />
        ) : (
          <div className="w-[360px] h-[360px] rounded-full border-4 border-dashed border-border flex items-center justify-center text-center p-10">
            <p className="text-text-muted font-medium">Empty wheel. Put at least one game back.</p>
          </div>
        )}
      </div>

      {/* Bench, centered under the wheel */}
      <div className="flex flex-col items-center gap-3 min-h-[3.5rem]">
        {benched.length === 0 ? (
          <p className="text-sm text-text-muted italic">Everyone plays. Click a slice to bench a game.</p>
        ) : (
          <>
            <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">On the bench</p>
            <div className="flex flex-wrap justify-center gap-2">
              {benched.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => restore(g.id)}
                  aria-label={`Put ${g.name} back in the wheel`}
                  className="group inline-flex items-center gap-2 rounded-full border-2 bg-surface pl-3 pr-2 py-1.5 font-bold text-text transition-all hover:-translate-y-0.5 hover:shadow-lg ib-pop"
                  style={{ borderColor: g.color }}
                >
                  <span className="text-xl">{g.emoji}</span>
                  <span>{g.name}</span>
                  <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" style={{ color: g.color }} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onSpin}
          disabled={inWheel.length === 0 || isSpinning}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-hover transition-all disabled:opacity-50 text-lg shadow-lg shadow-primary/20 active:scale-[0.98]"
        >
          <Dices className="w-5 h-5" />
          {isSpinning ? 'Spinning…' : 'Spin the wheel'}
        </button>
        <button type="button" onClick={onBack} disabled={isSpinning} className="flex items-center gap-1.5 text-sm font-bold text-text-muted hover:text-text transition-colors disabled:opacity-50">
          <ArrowLeft className="w-4 h-4" /> Back to the games
        </button>
      </div>
    </div>
  );
};

export default WheelSetup;
