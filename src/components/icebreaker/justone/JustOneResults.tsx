import React from 'react';
import { IceBreakerSubmission, JustOneRound } from '../../../types';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import Confetti from '../Confetti';
import { EndOfGameActions, GameHeader, MEDALS } from '../shared';
import { BurnedLine, TeamTrack, roundResult } from './progress';

interface Props {
  meta: IceBreakerGameMeta;
  rounds: JustOneRound[];
  guesses?: Record<string, { text: string; correct: boolean; at: number }>;
  submissions: Record<string, Record<string, IceBreakerSubmission>>;
  teamScore: number;
  nameOf: (id: string) => string;
  isAdmin: boolean;
  onStartRetro: () => void;
  onChangeGame: () => void;
}

const JustOneResults: React.FC<Props> = ({ meta, rounds, guesses, submissions, teamScore, nameOf, isAdmin, onStartRetro, onChangeGame }) => {
  // Who burned the most clues: the only ranking this cooperative game needs.
  const burnedByPlayer: Record<string, number> = {};
  for (const byPlayer of Object.values(submissions)) {
    for (const [pid, clue] of Object.entries(byPlayer)) {
      if (clue.kept === false) burnedByPlayer[pid] = (burnedByPlayer[pid] ?? 0) + 1;
    }
  }
  const hallOfFlame = Object.entries(burnedByPlayer)
    .map(([id, count]) => ({ id, name: nameOf(id), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 3);

  const ratio = rounds.length > 0 ? teamScore / rounds.length : 0;
  const verdict = ratio === 1 ? ['🧠', 'Telepathy', 'Are you sure you still need a retro?']
    : ratio >= 0.8 ? ['🔥', 'Same wavelength', 'Slightly scary. Keep it up.']
    : ratio >= 0.6 ? ['👏', 'Solid team play', 'A few burned clues, a lot of good ones.']
    : ratio >= 0.4 ? ['☕', 'Getting there', 'More coffee, more sync.']
    : ratio > 0 ? ['🤷', 'Rough day', 'Blame the words. Definitely the words.']
    : ['👻', 'Zero', 'Do you people even work together?'];
  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {teamScore > 0 && <Confetti colors={[meta.color, '#6ee7b7', '#6366f1', '#fde68a']} count={ratio === 1 ? 140 : 70} />}
      <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle="Final results" />

      <div className="text-center ib-pop">
        <div className="text-6xl mb-2">{verdict[0]}</div>
        <h2 className="text-4xl font-black text-text">{verdict[1]}</h2>
        <p className="text-text-muted mt-1">{verdict[2]}</p>
      </div>

      <div className="w-full max-w-xl bg-surface border-2 rounded-3xl p-6 text-center space-y-4 ib-fade-up" style={{ borderColor: meta.color }}>
        <div>
          <p className="text-xs font-black text-text-muted uppercase tracking-[0.25em] mb-1">Words found together</p>
          <p className="text-5xl font-black" style={{ color: meta.color }}>{teamScore} / {rounds.length}</p>
        </div>
        <div className="flex gap-1.5 h-3">
          {rounds.map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-full transition-colors"
              style={{ background: roundResult(guesses, i) === 'found' ? meta.color : 'var(--color-border)', animation: `ib-pop 0.4s ease-out ${i * 120}ms both` }}
            />
          ))}
        </div>
        <TeamTrack rounds={rounds} guesses={guesses} />
        <BurnedLine submissions={submissions} />
      </div>

      <div className="w-full max-w-xl bg-surface border border-border rounded-2xl p-5 ib-fade-up" style={{ animationDelay: '200ms' }}>
        <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-3">🔥 Hall of flame</p>
        {hallOfFlame.length === 0 ? (
          <p className="text-sm text-text-muted italic">Nobody burned a single clue. Suspiciously original.</p>
        ) : (
          <ol className="space-y-2">
            {hallOfFlame.map((row, i) => (
              <li key={row.id} className="flex items-center gap-3">
                <span className="w-7 text-center text-lg">{MEDALS[i]}</span>
                <span className="flex-1 font-bold text-text truncate">{row.name}</span>
                <span className="text-lg tracking-tight" aria-label={`${row.count} burned`}>{'🔥'.repeat(row.count)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <EndOfGameActions isAdmin={isAdmin} onStartRetro={onStartRetro} onChangeGame={onChangeGame} />
    </div>
  );
};

export default JustOneResults;
