import React, { useEffect, useState } from 'react';
import { IceBreakerSubmission } from '../../../types';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import { AdminRoundControls, CountdownRing, GameHeader } from '../shared';
import { GuesserBadge, REASONS } from './progress';

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
  nameOf: (id: string) => string;
}

const JustOneGuess: React.FC<Props> = ({
  meta, round, totalRounds, word, clues, iAmGuesser, guesserName, remaining, totalSeconds, isAdmin, onSubmit, onAdvance, onSkip, onChangeGame, nameOf
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

  const clueRows = Object.entries(clues).map(([id, clue]) => ({ id, name: nameOf(id), ...clue })).sort((a, b) => a.at - b.at);
  const kept = clueRows.filter(c => c.kept);
  const burned = clueRows.filter(c => !c.kept);
  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="w-full max-w-xl flex items-center justify-between">
        <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle={`Round ${round + 1} / ${totalRounds}`} />
        <CountdownRing remaining={remaining} total={totalSeconds} color={meta.color} />
      </div>
      <div className="flex gap-2"><GuesserBadge color={meta.color} iAmGuesser={iAmGuesser} guesserName={guesserName} /></div>

      <div key={`${round}-clues`} className="w-full max-w-xl bg-surface border-2 rounded-3xl p-8 text-center ib-pop shadow-2xl" style={{ borderColor: meta.color, boxShadow: `0 25px 60px -30px ${meta.color}` }}>
        <p className="text-xs font-black text-text-muted uppercase tracking-[0.25em] mb-4">
          {kept.length === 0 ? 'No clue survived' : `${kept.length} clue${kept.length > 1 ? 's' : ''} for ${iAmGuesser ? 'you' : guesserName}`}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {kept.map((c, i) => (
            <span key={c.id} className="px-5 py-3 rounded-2xl text-2xl font-black text-white ib-pop" style={{ background: meta.color, animationDelay: `${i * 90}ms` }}>
              {c.text}
            </span>
          ))}
        </div>
        {burned.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {burned.map(c => (
              <span key={c.id} className="px-3 py-1.5 rounded-full text-sm font-bold bg-red-500/10 text-red-500" title={c.reason ? REASONS[c.reason] : undefined}>
                🔥 {c.text ? <span className="line-through">{c.text}</span> : 'burned'}
              </span>
            ))}
          </div>
        )}
      </div>

      {iAmGuesser ? (
        <form onSubmit={submit} className="w-full max-w-xl flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value.slice(0, 80))}
            autoFocus
            disabled={pending || remaining === 0}
            placeholder="Your guess…"
            aria-label="Your guess"
            className="flex-1 px-5 py-4 border-2 border-border rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all text-lg text-text bg-surface disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!text.trim() || pending || remaining === 0}
            className="px-6 py-4 text-white font-bold rounded-2xl transition-all disabled:opacity-50 active:scale-[0.98]"
            style={{ background: meta.color }}
          >
            {pending ? '…' : 'Guess'}
          </button>
        </form>
      ) : (
        <div className="w-full max-w-xl bg-surface border border-border rounded-2xl p-5 text-center">
          <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-1">The word is</p>
          <p className="text-2xl font-black text-text">{word}</p>
          <p className="text-sm text-text-muted italic mt-2">Waiting for {guesserName} to guess…</p>
        </div>
      )}

      <AdminRoundControls isAdmin={isAdmin} revealLabel={iAmGuesser ? 'Pass' : 'Force reveal'} skipLabel="Skip this word" onAdvance={onAdvance} onSkip={onSkip} onChangeGame={onChangeGame} />
    </div>
  );
};

export default JustOneGuess;
