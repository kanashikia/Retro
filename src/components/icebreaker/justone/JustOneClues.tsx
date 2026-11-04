import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { IceBreakerSubmission, User } from '../../../types';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import { AdminRoundControls, CountdownRing, GameHeader, PlayerChips } from '../shared';
import { GuesserBadge } from './progress';

interface Props {
  meta: IceBreakerGameMeta;
  round: number;
  totalRounds: number;
  word?: string;
  clues: Record<string, IceBreakerSubmission>;
  iAmGuesser: boolean;
  guesserName: string;
  remaining: number;
  totalSeconds: number;
  isAdmin: boolean;
  onSubmit: (text: string, onRejected: () => void) => void;
  onAdvance: () => void;
  onSkip: () => void;
  onChangeGame: () => void;
  /** Everyone but the guesser. */
  writers: User[];
  myClue?: IceBreakerSubmission;
}

const JustOneClues: React.FC<Props> = ({
  meta, round, totalRounds, word, clues, iAmGuesser, guesserName, remaining, totalSeconds, isAdmin, onSubmit, onAdvance, onSkip, onChangeGame, writers, myClue
}) => {
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => { setText(''); setPending(false); }, [round]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || pending) return;
    setPending(true);
    onSubmit(value, () => setPending(false));
  };

  const done = writers.filter(p => clues[String(p.id)]).length;
  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="w-full max-w-xl flex items-center justify-between">
        <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle={`Round ${round + 1} / ${totalRounds}`} />
        <CountdownRing remaining={remaining} total={totalSeconds} color={meta.color} />
      </div>
      <div className="flex gap-2"><GuesserBadge color={meta.color} iAmGuesser={iAmGuesser} guesserName={guesserName} /></div>

      {iAmGuesser ? (
        <div key={round} className="w-full max-w-xl bg-surface border-2 border-border rounded-3xl p-10 text-center ib-pop">
          <div className="text-6xl mb-4 ib-float">🙈</div>
          <h2 className="text-2xl font-black text-text">You're the guesser</h2>
          <p className="text-text-muted mt-2">The others are writing their clues. {done} / {writers.length} locked.</p>
        </div>
      ) : (
        <>
          <div key={round} className="w-full max-w-xl bg-surface border-2 rounded-3xl p-10 text-center ib-pop shadow-2xl" style={{ borderColor: meta.color, boxShadow: `0 25px 60px -30px ${meta.color}` }}>
            <p className="text-xs font-black text-text-muted uppercase tracking-[0.25em] mb-3">The secret word</p>
            <div className="text-5xl font-black text-text">{word}</div>
            <p className="text-xs text-text-muted mt-3">Shh. {guesserName} can't see this.</p>
          </div>

          {myClue ? (
            <div className="w-full max-w-xl rounded-2xl p-5 text-center border-2 border-emerald-500 bg-emerald-500/10 ib-pop" role="status">
              <p className="text-xl font-black text-emerald-600"><Lock className="inline w-5 h-5 mr-1 -mt-1" />Clue locked: “{myClue.text}”</p>
              <p className="text-sm text-emerald-600/80 mt-1">Fingers crossed nobody wrote the same.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="w-full max-w-xl flex gap-2">
              <input
                value={text}
                onChange={e => setText(e.target.value.slice(0, 30))}
                autoFocus
                disabled={pending || remaining === 0}
                placeholder="One word, no spaces…"
                aria-label="Your clue"
                className="flex-1 px-5 py-4 border-2 border-border rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all text-lg text-text bg-surface disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!text.trim() || /\s/.test(text.trim()) || pending || remaining === 0}
                className="px-6 py-4 text-white font-bold rounded-2xl transition-all disabled:opacity-50 active:scale-[0.98]"
                style={{ background: meta.color }}
              >
                {pending ? '…' : 'Lock clue'}
              </button>
            </form>
          )}
        </>
      )}

      <PlayerChips players={writers} isDone={p => Boolean(clues[String(p.id)])} />

      <AdminRoundControls isAdmin={isAdmin} revealLabel="Close clues now" skipLabel="Skip this word" onAdvance={onAdvance} onSkip={onSkip} onChangeGame={onChangeGame} />
    </div>
  );
};

export default JustOneClues;
