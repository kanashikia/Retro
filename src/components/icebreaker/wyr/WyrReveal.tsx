import React from 'react';
import { IceBreakerSubmission } from '../../../types';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import { GameHeader, NextRoundButton } from '../shared';
import { SIDE_COLORS, Side, splitOf } from './sides';

interface Props {
  meta: IceBreakerGameMeta;
  round: number;
  dilemmas: { a: string; b: string }[];
  dilemma?: { a: string; b: string };
  votes: Record<string, IceBreakerSubmission>;
  nameOf: (id: string) => string;
  isAdmin: boolean;
  onAdvance: () => void;
}

const WyrReveal: React.FC<Props> = ({ meta, round, dilemmas, dilemma, votes, nameOf, isAdmin, onAdvance }) => {
  const s = splitOf(votes);
  const pct = (n: number) => (s.total > 0 ? Math.round((n / s.total) * 100) : 0);
  const isLast = round >= dilemmas.length - 1;
  const sides: Side[] = ['a', 'b'];
  const verdict = s.total === 0 ? 'Nobody voted. Awkward.'
    : s.a === s.b ? 'Split right down the middle.'
    : s.a === 0 || s.b === 0 ? 'Unanimous. Not even a debate.'
    : Math.min(s.a, s.b) === 1 ? 'One brave soul against everyone.'
    : 'Not that obvious, is it?';
  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle={`Dilemma ${round + 1} / ${dilemmas.length}`} />

      <div className="grid sm:grid-cols-2 gap-4 w-full max-w-3xl">
        {sides.map(side => {
          const count = s[side];
          const won = count > s[side === 'a' ? 'b' : 'a'];
          const names = Object.entries(votes).filter(([, v]) => v.text === side).map(([pid]) => nameOf(pid));
          return (
            <div
              key={side}
              className={`relative overflow-hidden rounded-3xl border-2 p-6 bg-surface ib-pop ${won ? 'shadow-2xl' : ''}`}
              style={{ borderColor: won ? SIDE_COLORS[side] : 'var(--color-border)', boxShadow: won ? `0 20px 50px -25px ${SIDE_COLORS[side]}` : undefined, animationDelay: side === 'b' ? '120ms' : undefined }}
            >
              <div className="absolute inset-y-0 left-0 opacity-15 transition-all duration-700" style={{ width: `${pct(count)}%`, background: SIDE_COLORS[side] }} />
              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.2em] mb-2" style={{ color: SIDE_COLORS[side] }}>{side === 'a' ? 'Option A' : 'Option B'}</p>
                <p className="text-xl font-black text-text leading-snug">{dilemma?.[side]}</p>
                <p className="text-4xl font-black mt-4" style={{ color: SIDE_COLORS[side] }}>{pct(count)}%</p>
                <p className="text-sm text-text-muted mt-1 truncate">{names.length === 0 ? 'Nobody' : names.join(', ')}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-text-muted font-medium">{verdict}</p>

      <NextRoundButton isAdmin={isAdmin} color={meta.color} isLast={isLast} nextLabel="Next dilemma" onAdvance={onAdvance} />
    </div>
  );
};

export default WyrReveal;
