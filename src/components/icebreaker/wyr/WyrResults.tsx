import React from 'react';
import { IceBreakerSubmission } from '../../../types';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import Confetti from '../Confetti';
import { EndOfGameActions, GameHeader, MEDALS } from '../shared';
import { Side, splitOf } from './sides';

interface Props {
  meta: IceBreakerGameMeta;
  dilemmas: { a: string; b: string }[];
  /** Every round's votes, keyed by round then participant id. */
  submissions: Record<string, Record<string, IceBreakerSubmission>>;
  nameOf: (id: string) => string;
  isAdmin: boolean;
  onStartRetro: () => void;
  onChangeGame: () => void;
}

interface RankingRow { id: string; name: string; count: number }

/** Top three of one ranking; without `color` the count stays muted. */
const RankingCard: React.FC<{ title: string; empty: string; rows: RankingRow[]; color?: string; countLabel: (count: number) => string }> = ({
  title, empty, rows, color, countLabel
}) => (
  <div className="bg-surface border border-border rounded-2xl p-5">
    <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-3">{title}</p>
    {rows.length === 0 ? (
      <p className="text-sm text-text-muted italic">{empty}</p>
    ) : (
      <ol className="space-y-2">
        {rows.map((row, i) => (
          <li key={row.id} className="flex items-center gap-3">
            <span className="w-7 text-center text-lg">{MEDALS[i]}</span>
            <span className="flex-1 font-bold text-text truncate">{row.name}</span>
            <span className={`text-sm font-bold ${color ? '' : 'text-text-muted'}`} style={color ? { color } : undefined}>{countLabel(row.count)}</span>
          </li>
        ))}
      </ol>
    )}
  </div>
);

const WyrResults: React.FC<Props> = ({ meta, dilemmas, submissions, nameOf, isAdmin, onStartRetro, onChangeGame }) => {
  // Contrarians voted with the strict minority; team players with the strict majority.
  const contrarian: Record<string, number> = {};
  const mainstream: Record<string, number> = {};
  let unanimous = 0;
  dilemmas.forEach((_, r) => {
    const { a, b } = splitOf(submissions[String(r)]);
    if (a === 0 || b === 0) { if (a + b > 0) unanimous += 1; return; }
    if (a === b) return;
    const minority: Side = a < b ? 'a' : 'b';
    for (const [pid, v] of Object.entries(submissions[String(r)] ?? {})) {
      if (v.text === minority) contrarian[pid] = (contrarian[pid] ?? 0) + 1;
      else mainstream[pid] = (mainstream[pid] ?? 0) + 1;
    }
  });
  const top = (map: Record<string, number>) => Object.entries(map)
    .map(([id, count]) => ({ id, name: nameOf(id), count }))
    .sort((x, y) => y.count - x.count || x.name.localeCompare(y.name))
    .slice(0, 3);
  const mavericks = top(contrarian);
  const teamPlayers = top(mainstream);

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <Confetti colors={[meta.color, '#6366f1', '#fde68a', '#6ee7b7']} />
      <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle="Final results" />
      <div className="text-center ib-pop">
        <div className="text-6xl mb-2">{unanimous === dilemmas.length ? '🧠' : mavericks[0] ? '🦄' : '🤝'}</div>
        <h2 className="text-4xl font-black text-text">
          {unanimous === dilemmas.length ? 'One single brain' : unanimous > 0 ? `${unanimous} unanimous pick${unanimous > 1 ? 's' : ''}` : 'Never unanimous'}
        </h2>
        <p className="text-text-muted mt-1">
          {unanimous === dilemmas.length ? 'Not one disagreement. Suspicious.' : unanimous > 0 ? 'The rest was a proper debate.' : 'This team agrees on nothing. Healthy.'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 w-full max-w-3xl">
        <RankingCard title="🦄 Mavericks" empty="Nobody dared to be in the minority." rows={mavericks} color={meta.color} countLabel={count => `${count}× against the crowd`} />
        <RankingCard title="🤝 Team spirit" empty="No clear majority this time." rows={teamPlayers} countLabel={count => `${count}× with the team`} />
      </div>

      <div className="w-full max-w-3xl bg-surface border border-border rounded-2xl p-5 space-y-2">
        <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-1">The dilemmas</p>
        {dilemmas.map((d, r) => {
          const s = splitOf(submissions[String(r)]);
          const winner: Side | null = s.a === s.b ? null : s.a > s.b ? 'a' : 'b';
          return (
            <div key={r} className="flex items-center gap-3 text-sm">
              <span className={`flex-1 text-right truncate ${winner === 'a' ? 'font-black text-text' : 'text-text-muted'}`}>{d.a}</span>
              <span className="shrink-0 font-black tabular-nums px-2 py-0.5 rounded-full bg-secondary text-text">{s.a} · {s.b}</span>
              <span className={`flex-1 truncate ${winner === 'b' ? 'font-black text-text' : 'text-text-muted'}`}>{d.b}</span>
            </div>
          );
        })}
      </div>

      <EndOfGameActions isAdmin={isAdmin} onStartRetro={onStartRetro} onChangeGame={onChangeGame} />
    </div>
  );
};

export default WyrResults;
