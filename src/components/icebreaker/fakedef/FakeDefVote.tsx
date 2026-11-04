import React, { useEffect, useState } from 'react';
import { FakeDefBallot, User } from '../../../types';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import { AdminRoundControls, CountdownRing, GameHeader, PlayerChips } from '../shared';
import WordCard from './WordCard';

const LETTERS = 'ABCDEFGHIJKLMNOP';

interface Props {
  meta: IceBreakerGameMeta;
  round: number;
  totalRounds: number;
  word?: string;
  ballots: FakeDefBallot[];
  votes: Record<string, { index?: number; at: number }>;
  /** My own fake definition: the ballot holding it cannot get my vote. */
  myText?: string;
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

const FakeDefVote: React.FC<Props> = ({
  meta, round, totalRounds, word, ballots, votes, myText, participants, me, remaining, totalSeconds, isAdmin, onSubmit, onAdvance, onSkip, onChangeGame
}) => {
  const myVote = votes[me];
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { setPending(null); }, [round]);
  useEffect(() => { if (myVote) setPending(null); }, [myVote]);

  const vote = (index: number) => {
    if (pending || myVote) return;
    setPending(String(index));
    onSubmit(String(index), () => setPending(null));
  };

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="w-full max-w-xl flex items-center justify-between">
        <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle={`Word ${round + 1} / ${totalRounds}`} />
        <CountdownRing remaining={remaining} total={totalSeconds} color={meta.color} />
      </div>
      <WordCard key={round} word={word} color={meta.color} />
      <p className="text-xs font-black text-text-muted uppercase tracking-[0.25em]">Which one is the real definition?</p>

      <div className="w-full max-w-xl space-y-3">
        {ballots.map((b, i) => {
          const mine = Boolean(myText) && b.text === myText;
          const chosen = myVote?.index === i || pending === String(i);
          const dimmed = Boolean(myVote || pending) && !chosen;
          return (
            <button
              key={i}
              type="button"
              onClick={() => vote(i)}
              disabled={mine || Boolean(myVote) || Boolean(pending) || remaining === 0}
              aria-label={`Vote for definition ${LETTERS[i]}: ${b.text}`}
              className={`w-full flex items-start gap-4 rounded-2xl border-2 bg-surface p-4 text-left transition-all duration-300 ib-fade-up
                enabled:hover:-translate-y-0.5 enabled:hover:shadow-xl disabled:cursor-default focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40
                ${chosen ? 'shadow-xl' : ''} ${dimmed || mine ? 'opacity-50' : ''}`}
              style={{ borderColor: chosen ? meta.color : 'var(--color-border)', animationDelay: `${i * 60}ms` }}
            >
              <span className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white shrink-0" style={{ background: meta.color }}>{LETTERS[i]}</span>
              <span className="flex-1 font-bold text-text leading-snug">{b.text}</span>
              {mine && <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-secondary text-text-muted">yours</span>}
              {chosen && <span className="text-xl">✅</span>}
            </button>
          );
        })}
      </div>

      <PlayerChips players={participants} isDone={p => Boolean(votes[String(p.id)])} />
      <AdminRoundControls isAdmin={isAdmin} revealLabel="Reveal now" skipLabel="Skip this word" onAdvance={onAdvance} onSkip={onSkip} onChangeGame={onChangeGame} />
    </div>
  );
};

export default FakeDefVote;
