import React from 'react';
import { FakeDefBallot } from '../../../types';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import { GameHeader, Leaderboard, LeaderboardRow, NextRoundButton } from '../shared';

interface Props {
  meta: IceBreakerGameMeta;
  round: number;
  totalRounds: number;
  word?: string;
  definition?: string;
  ballots: FakeDefBallot[];
  votes: Record<string, { index?: number; at: number }>;
  nameOf: (id: string) => string;
  leaderboard: LeaderboardRow[];
  me: string;
  isAdmin: boolean;
  onAdvance: () => void;
}

const FakeDefReveal: React.FC<Props> = ({
  meta, round, totalRounds, word, definition, ballots, votes, nameOf, leaderboard, me, isAdmin, onAdvance
}) => {
    const votersOf = (index: number) => Object.entries(votes).filter(([, v]) => v.index === index).map(([pid]) => nameOf(pid));
  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle={`Word ${round + 1} / ${totalRounds}`} />
      <div className="w-full max-w-xl bg-surface border-2 rounded-3xl p-6 text-center ib-pop" style={{ borderColor: meta.color }}>
        <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-1">{word}</p>
        <p className="text-xs font-black uppercase tracking-[0.2em] mb-2" style={{ color: meta.color }}>really means</p>
        <h2 className="text-2xl font-black text-text leading-snug">{definition}</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4 w-full max-w-3xl">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-3">The bluffs</p>
          <ul className="space-y-3">
            {ballots.map((b, i) => {
              const voters = votersOf(i);
              const real = b.key === 'real';
              return (
                <li key={i} className={`rounded-xl p-3 ib-fade-up ${real ? 'bg-emerald-500/10' : 'bg-secondary'}`} style={{ animationDelay: `${i * 70}ms` }}>
                  <p className={`font-bold ${real ? 'text-emerald-600' : 'text-text'}`}>{real ? '✅ ' : '🎭 '}{b.text}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {real ? 'The real one' : `by ${nameOf(b.key ?? '')}`}
                    {voters.length > 0 ? ` · fooled: ${voters.join(', ')}` : real ? '' : ' · fooled nobody'}
                    {real && voters.length > 0 ? ` (spotted by ${voters.join(', ')})` : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
        <Leaderboard rows={leaderboard} color={meta.color} highlightId={me} />
      </div>

      <NextRoundButton isAdmin={isAdmin} color={meta.color} isLast={round >= totalRounds - 1} nextLabel="Next word" onAdvance={onAdvance} />
    </div>
  );
};

export default FakeDefReveal;
