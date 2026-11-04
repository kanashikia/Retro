import React from 'react';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import Confetti from '../Confetti';
import { EndOfGameActions, GameHeader, Leaderboard, LeaderboardRow } from '../shared';

interface Props {
  meta: IceBreakerGameMeta;
  leaderboard: LeaderboardRow[];
  winnerName?: string;
  me: string;
  isAdmin: boolean;
  onStartRetro: () => void;
  onChangeGame: () => void;
}

const FakeDefResults: React.FC<Props> = ({ meta, leaderboard, winnerName, me, isAdmin, onStartRetro, onChangeGame }) => {
  const champion = leaderboard[0];
  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <Confetti colors={[meta.color, '#fde68a', '#6366f1', '#10b981']} />
      <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle="Final results" />
      <div className="text-center ib-pop">
        <p className="text-xs font-black text-text-muted uppercase tracking-[0.25em] mb-2">Best liar</p>
        <h2 className="text-5xl font-black" style={{ color: meta.color }}>🎭 {winnerName || (champion && champion.score > 0 ? champion.name : 'Nobody')}</h2>
        <p className="text-text-muted mt-2">Fooled the most colleagues, or saw through every bluff.</p>
      </div>
      <Leaderboard rows={leaderboard} color={meta.color} highlightId={me} />
      <EndOfGameActions isAdmin={isAdmin} onStartRetro={onStartRetro} onChangeGame={onChangeGame} />
    </div>
  );
};

export default FakeDefResults;
