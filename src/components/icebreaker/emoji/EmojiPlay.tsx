import React, { useEffect, useState } from 'react';
import { EmojiCharade, IceBreakerSubmission, User } from '../../../types';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import { AdminRoundControls, CountdownRing, GameHeader, MEDALS } from '../shared';

interface Props {
  meta: IceBreakerGameMeta;
  round: number;
  totalRounds: number;
  charade?: EmojiCharade;
  submissions: Record<string, IceBreakerSubmission>;
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

const MyResult: React.FC<{ submission: IceBreakerSubmission }> = ({ submission }) => (
  <div
    className={`w-full max-w-xl rounded-2xl p-5 text-center border-2 ${submission.correct ? 'ib-pop border-emerald-500 bg-emerald-500/10' : 'ib-shake border-red-400 bg-red-500/10'}`}
    role="status"
  >
    {submission.correct ? (
      <>
        <p className="text-2xl font-black text-emerald-600">{MEDALS[submission.rank - 1] ?? '✅'} Got it! #{submission.rank}</p>
        <p className="text-sm font-bold text-emerald-600/80 mt-1">+{submission.points} pts</p>
      </>
    ) : (
      <>
        <p className="text-2xl font-black text-red-500">❌ Nope</p>
        <p className="text-sm text-text-muted mt-1 italic">“{submission.text}” — wait for the reveal.</p>
      </>
    )}
  </div>
);

const GuessForm: React.FC<{ round: number; color: string; closed: boolean; onSubmit: Props['onSubmit'] }> = ({ round, color, closed, onSubmit }) => {
  const [guess, setGuess] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => { setGuess(''); setPending(false); }, [round]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = guess.trim();
    if (!text || pending) return;
    setPending(true);
    onSubmit(text, () => setPending(false));
  };

  return (
    <form onSubmit={submit} className="w-full max-w-xl flex gap-2">
      <input
        value={guess}
        onChange={e => setGuess(e.target.value.slice(0, 80))}
        autoFocus
        disabled={pending || closed}
        placeholder="Type your guess…"
        aria-label="Your guess"
        className="flex-1 px-5 py-4 border-2 border-border rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all text-lg text-text bg-surface disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={!guess.trim() || pending || closed}
        className="px-6 py-4 text-white font-bold rounded-2xl transition-all disabled:opacity-50 active:scale-[0.98]"
        style={{ background: color }}
      >
        {pending ? '…' : 'Guess'}
      </button>
    </form>
  );
};

const EmojiPlay: React.FC<Props> = ({
  meta, round, totalRounds, charade, submissions, participants, me, remaining, totalSeconds, isAdmin, onSubmit, onAdvance, onSkip, onChangeGame
}) => {
  const mySubmission = submissions[me];
  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="w-full max-w-xl flex items-center justify-between">
        <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle={`Round ${round + 1} / ${totalRounds}`} />
        <CountdownRing remaining={remaining} total={totalSeconds} color={meta.color} />
      </div>

      <div key={round} className="w-full max-w-xl bg-surface border-2 border-border rounded-3xl p-10 text-center ib-pop shadow-2xl" style={{ boxShadow: `0 25px 60px -30px ${meta.color}` }}>
        <p className="text-xs font-black text-text-muted uppercase tracking-[0.25em] mb-5">Which movie or series?</p>
        <div className="text-7xl md:text-8xl leading-none tracking-[0.15em]">{charade?.emojis}</div>
      </div>

      {mySubmission
        ? <MyResult submission={mySubmission} />
        : <GuessForm round={round} color={meta.color} closed={remaining === 0} onSubmit={onSubmit} />}

      <div className="flex flex-wrap justify-center gap-2 max-w-xl">
        {participants.map(p => {
          const sub = submissions[String(p.id)];
          const cls = !sub
            ? 'bg-secondary text-text-muted'
            : sub.correct
            ? 'bg-emerald-500/15 text-emerald-600'
            : 'bg-red-500/10 text-red-500';
          return (
            <span key={p.id} className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${cls}`}>
              {!sub ? '… ' : sub.correct ? '✓ ' : '✗ '}{p.name}
            </span>
          );
        })}
      </div>

      <AdminRoundControls isAdmin={isAdmin} revealLabel="Reveal now" skipLabel="Skip this one" onAdvance={onAdvance} onSkip={onSkip} onChangeGame={onChangeGame} />
    </div>
  );
};

export default EmojiPlay;
