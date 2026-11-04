import React from 'react';
import { IceBreakerSubmission, JustOneRound } from '../../../types';

type Guesses = Record<string, { text: string; correct: boolean; at: number }>;
type AllSubmissions = Record<string, Record<string, IceBreakerSubmission>>;

export const REASONS: Record<string, string> = { duplicate: 'same as another clue', word: 'gave the word away' };

export const roundResult = (guesses: Guesses | undefined, i: number): 'found' | 'missed' | 'pending' => {
  const g = guesses?.[String(i)];
  if (!g) return 'pending';
  return g.correct ? 'found' : 'missed';
};

export const burnedClues = (submissions: AllSubmissions) => {
  const all = Object.values(submissions).flatMap(r => Object.values(r));
  const burned = all.filter(c => c.kept === false).length;
  return { total: all.length, burned, pct: all.length > 0 ? Math.round((burned / all.length) * 100) : 0 };
};

// Cooperative game: the only score is the team's. The track shows each word
// found or missed so far; words still to come stay hidden.
export const TeamTrack: React.FC<{ rounds: JustOneRound[]; guesses?: Guesses }> = ({ rounds, guesses }) => (
  <div className="flex flex-wrap justify-center gap-2">
    {rounds.map((r, i) => {
      const res = roundResult(guesses, i);
      const cls = res === 'found'
        ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/40'
        : res === 'missed'
        ? 'bg-red-500/10 text-red-500 border-red-400/40'
        : 'bg-secondary text-text-muted border-transparent';
      return (
        <span key={i} className={`px-3 py-1.5 rounded-full text-sm font-bold border ib-fade-up ${cls}`} style={{ animationDelay: `${i * 60}ms` }}>
          {res === 'found' ? '✅ ' : res === 'missed' ? '❌ ' : '🔒 '}
          {res === 'pending' ? `Word ${i + 1}` : <span className={res === 'missed' ? 'line-through' : ''}>{r.word ?? '?'}</span>}
        </span>
      );
    })}
  </div>
);

export const BurnedLine: React.FC<{ submissions: AllSubmissions }> = ({ submissions }) => {
  const { total, burned, pct } = burnedClues(submissions);
  if (total === 0) return null;
  return (
    <p className="text-sm text-text-muted">
      🔥 {pct}% of clues burned along the way{burned === 0 ? '. Original minds.' : pct >= 50 ? '. Great minds think alike, too much.' : '.'}
    </p>
  );
};

export const GuesserBadge: React.FC<{ color: string; iAmGuesser: boolean; guesserName: string }> = ({ color, iAmGuesser, guesserName }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold" style={{ background: `${color}22`, color }}>
    🎯 {iAmGuesser ? 'You guess' : `${guesserName} guesses`}
  </span>
);

export const TeamPill: React.FC<{ teamScore: number; totalRounds: number }> = ({ teamScore, totalRounds }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-secondary text-text">
    🤝 Team {teamScore} / {totalRounds}
  </span>
);
