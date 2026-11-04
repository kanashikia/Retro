import React, { useEffect, useState } from 'react';
import { IceBreakerSubmission, User } from '../../../types';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import { AdminRoundControls, CountdownRing, GameHeader, PlayerChips } from '../shared';
import { SIDE_COLORS, Side } from './sides';

interface Props {
  meta: IceBreakerGameMeta;
  round: number;
  dilemmas: { a: string; b: string }[];
  dilemma?: { a: string; b: string };
  votes: Record<string, IceBreakerSubmission>;
  participants: User[];
  me: string;
  remaining: number;
  totalSeconds: number;
  isAdmin: boolean;
  onSubmit: (text: string, onRejected: () => void) => void;
  onAdvance: () => void;
  onSkip: () => void;
  onChangeGame: () => void;
}

const WyrPlay: React.FC<Props> = ({
  meta, round, dilemmas, dilemma, votes, participants, me, remaining, totalSeconds, isAdmin, onSubmit, onAdvance, onSkip, onChangeGame
}) => {
  const myVote = votes[me]?.text as Side | undefined;
  const [pending, setPending] = useState<Side | null>(null);
  useEffect(() => { setPending(null); }, [round]);
  useEffect(() => { if (myVote) setPending(null); }, [myVote]);

  const vote = (side: Side) => {
    if (pending || myVote) return;
    setPending(side);
    onSubmit(side, () => setPending(null));
  };

  const voted = participants.filter(p => votes[String(p.id)]).length;
  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="w-full max-w-3xl flex items-center justify-between">
        <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle={`Dilemma ${round + 1} / ${dilemmas.length}`} />
        <CountdownRing remaining={remaining} total={totalSeconds} color={meta.color} />
      </div>

      <p className="text-xs font-black text-text-muted uppercase tracking-[0.25em]">Would you rather…</p>

      <div key={round} className="grid sm:grid-cols-2 gap-4 w-full max-w-3xl items-stretch">
        {(['a', 'b'] as Side[]).map((side, i) => {
          const chosen = myVote === side || pending === side;
          const dimmed = (myVote || pending) && !chosen;
          return (
            <button
              key={side}
              type="button"
              onClick={() => vote(side)}
              disabled={Boolean(myVote) || Boolean(pending) || remaining === 0}
              aria-label={`Option ${side.toUpperCase()}: ${dilemma?.[side]}`}
              className={`group relative rounded-3xl border-2 p-8 text-left bg-surface transition-all duration-300 ib-pop focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40
                enabled:hover:-translate-y-1 enabled:hover:shadow-2xl enabled:active:translate-y-0 disabled:cursor-default
                ${chosen ? 'shadow-2xl scale-[1.02]' : ''} ${dimmed ? 'opacity-50' : ''}`}
              style={{ borderColor: chosen ? SIDE_COLORS[side] : 'var(--color-border)', boxShadow: chosen ? `0 20px 50px -25px ${SIDE_COLORS[side]}` : undefined, animationDelay: `${i * 120}ms` }}
            >
              <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: SIDE_COLORS[side] }}>{side === 'a' ? 'Option A' : 'Option B'}</span>
              <p className="text-2xl font-black text-text leading-snug mt-2">{dilemma?.[side]}</p>
              {chosen && <span className="absolute top-4 right-4 text-2xl ib-pop">✅</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-text-muted">{voted} / {participants.length} voted</p>
        <PlayerChips players={participants} isDone={p => Boolean(votes[String(p.id)])} />
      </div>

      <AdminRoundControls isAdmin={isAdmin} revealLabel="Reveal now" skipLabel="Skip this one" onAdvance={onAdvance} onSkip={onSkip} onChangeGame={onChangeGame} />
    </div>
  );
};

export default WyrPlay;
