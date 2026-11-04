import React from 'react';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import Confetti from '../Confetti';
import { EndOfGameActions, GameHeader, Leaderboard, LeaderboardRow, MEDALS } from '../shared';

interface Props {
  meta: IceBreakerGameMeta;
  leaderboard: LeaderboardRow[];
  winnerName?: string;
  me: string;
  isAdmin: boolean;
  onStartRetro: () => void;
  onChangeGame: () => void;
}

const PODIUM_HEIGHTS: Record<number, string> = { 0: 'h-28', 1: 'h-20', 2: 'h-14' };

const EmojiResults: React.FC<Props> = ({ meta, leaderboard, winnerName, me, isAdmin, onStartRetro, onChangeGame }) => {
  const podium = leaderboard.slice(0, 3);
  // Second, first, third: the winner stands in the middle
  const order = [podium[1], podium[0], podium[2]].filter(Boolean);
  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <Confetti colors={[meta.color, '#fde68a', '#6366f1', '#10b981']} />
      <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle="Final results" />
      <div className="text-center ib-pop">
        <p className="text-xs font-black text-text-muted uppercase tracking-[0.25em] mb-2">Champion</p>
        <h2 className="text-5xl font-black" style={{ color: meta.color }}>
          🏆 {winnerName || leaderboard[0]?.name || 'Nobody'}
        </h2>
      </div>

      <div className="flex items-end justify-center gap-3 w-full max-w-lg">
        {order.map((row) => {
          const rank = leaderboard.findIndex(r => r.id === row.id);
          return (
            <div key={row.id} className="flex-1 flex flex-col items-center gap-2 ib-fade-up" style={{ animationDelay: `${rank * 120}ms` }}>
              <span className="text-3xl">{MEDALS[rank]}</span>
              <span className="font-black text-text text-center truncate max-w-full">{row.name}</span>
              <div
                className={`w-full rounded-t-2xl flex items-end justify-center pb-2 text-white font-black ${PODIUM_HEIGHTS[rank]}`}
                style={{ background: meta.color, opacity: 1 - rank * 0.25 }}
              >
                {row.score}
              </div>
            </div>
          );
        })}
      </div>

      <Leaderboard rows={leaderboard} color={meta.color} highlightId={me} title="Full ranking" />

      <EndOfGameActions isAdmin={isAdmin} onStartRetro={onStartRetro} onChangeGame={onChangeGame} />
    </div>
  );
};

export default EmojiResults;
