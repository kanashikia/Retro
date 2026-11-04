import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { IceBreakerSubmission, User } from '../../../types';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import { AdminRoundControls, CountdownRing, GameHeader, PlayerChips } from '../shared';
import WordCard from './WordCard';

interface Props {
  meta: IceBreakerGameMeta;
  round: number;
  totalRounds: number;
  word?: string;
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

const FakeDefWriting: React.FC<Props> = ({
  meta, round, totalRounds, word, submissions, participants, me, remaining, totalSeconds, isAdmin, onSubmit, onAdvance, onSkip, onChangeGame
}) => {
  const mySubmission = submissions[me];
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => { setText(''); setPending(false); }, [round]);

  const lockDefinition = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || pending) return;
    setPending(true);
    onSubmit(value, () => setPending(false));
  };

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="w-full max-w-xl flex items-center justify-between">
        <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle={`Word ${round + 1} / ${totalRounds}`} />
        <CountdownRing remaining={remaining} total={totalSeconds} color={meta.color} />
      </div>
      <WordCard key={round} word={word} color={meta.color} />

      {mySubmission ? (
        <div className="w-full max-w-xl rounded-2xl p-5 text-center border-2 border-emerald-500 bg-emerald-500/10 ib-pop" role="status">
          <p className="text-lg font-black text-emerald-600"><Lock className="inline w-5 h-5 mr-1 -mt-1" />Locked: “{mySubmission.text}”</p>
          <p className="text-sm text-emerald-600/80 mt-1">Sounds legit. Let's see who bites.</p>
        </div>
      ) : (
        <form onSubmit={lockDefinition} className="w-full max-w-xl flex flex-col gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, 160))}
            autoFocus
            disabled={Boolean(pending) || remaining === 0}
            rows={2}
            placeholder="Your fake definition, as serious as possible…"
            aria-label="Your definition"
            className="w-full px-5 py-4 border-2 border-border rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all text-lg text-text bg-surface disabled:opacity-60 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">{text.length} / 160</span>
            <button
              type="submit"
              disabled={text.trim().length < 3 || Boolean(pending) || remaining === 0}
              className="px-6 py-3 text-white font-bold rounded-2xl transition-all disabled:opacity-50 active:scale-[0.98]"
              style={{ background: meta.color }}
            >
              {pending ? '…' : 'Lock definition'}
            </button>
          </div>
        </form>
      )}

      <PlayerChips players={participants} isDone={p => Boolean(submissions[String(p.id)])} />
      <AdminRoundControls isAdmin={isAdmin} revealLabel="Close definitions now" skipLabel="Skip this word" onAdvance={onAdvance} onSkip={onSkip} onChangeGame={onChangeGame} />
    </div>
  );
};

export default FakeDefWriting;
