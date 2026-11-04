import React from 'react';
import { EmojiCharade, IceBreakerSubmission } from '../../../types';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import { GameHeader, Leaderboard, LeaderboardRow, MEDALS, NextRoundButton } from '../shared';

interface Props {
  meta: IceBreakerGameMeta;
  round: number;
  totalRounds: number;
  charade?: EmojiCharade;
  submissions: Record<string, IceBreakerSubmission>;
  nameOf: (id: string) => string;
  leaderboard: LeaderboardRow[];
  me: string;
  isAdmin: boolean;
  onAdvance: () => void;
}

const EmojiReveal: React.FC<Props> = ({ meta, round, totalRounds, charade, submissions, nameOf, leaderboard, me, isAdmin, onAdvance }) => {
  const rows = Object.entries(submissions)
    .map(([id, sub]) => ({ id, name: nameOf(id), ...sub }))
    .sort((a, b) => (b.correct ? 1 : 0) - (a.correct ? 1 : 0) || a.rank - b.rank || a.at - b.at);
  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle={`Round ${round + 1} / ${totalRounds}`} />

      <div className="w-full max-w-xl bg-surface border-2 rounded-3xl p-8 text-center ib-pop" style={{ borderColor: meta.color }}>
        <div className="text-5xl mb-3">{charade?.emojis}</div>
        <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-1">It was</p>
        <h2 className="text-4xl font-black text-text">{charade?.answer ?? '…'}</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4 w-full max-w-3xl">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-3">This round</p>
          {rows.length === 0 ? (
            <p className="text-text-muted italic text-sm">Nobody answered. Tough one.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row, i) => (
                <li key={row.id} className="flex items-center gap-3 ib-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
                  <span className="w-7 text-center text-lg">{row.correct ? (MEDALS[row.rank - 1] ?? '✅') : '❌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text truncate">{row.name}</p>
                    <p className="text-xs text-text-muted italic truncate">“{row.text}”</p>
                  </div>
                  <span className={`font-black tabular-nums ${row.correct ? '' : 'text-text-muted'}`} style={row.correct ? { color: meta.color } : undefined}>
                    +{row.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Leaderboard rows={leaderboard} color={meta.color} highlightId={me} />
      </div>

      <NextRoundButton isAdmin={isAdmin} color={meta.color} isLast={round >= totalRounds - 1} nextLabel="Next round" onAdvance={onAdvance} />
    </div>
  );
};

export default EmojiReveal;
