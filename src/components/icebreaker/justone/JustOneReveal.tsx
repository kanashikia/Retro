import React from 'react';
import { IceBreakerSubmission, JustOneRound } from '../../../types';
import { IceBreakerGameMeta } from '../../../icebreaker/games';
import { GameHeader, NextRoundButton } from '../shared';
import { BurnedLine, GuesserBadge, REASONS, TeamPill, TeamTrack } from './progress';

interface Props {
  meta: IceBreakerGameMeta;
  round: number;
  rounds: JustOneRound[];
  word?: string;
  guesses?: Record<string, { text: string; correct: boolean; at: number }>;
  guess?: { text: string; correct: boolean; at: number };
  submissions: Record<string, Record<string, IceBreakerSubmission>>;
  clues: Record<string, IceBreakerSubmission>;
  teamScore: number;
  iAmGuesser: boolean;
  guesserName: string;
  nameOf: (id: string) => string;
  isAdmin: boolean;
  onAdvance: () => void;
}

const JustOneReveal: React.FC<Props> = ({
  meta, round, rounds, word, guesses, guess, submissions, clues, teamScore, iAmGuesser, guesserName, nameOf, isAdmin, onAdvance
}) => {
  const rows = Object.entries(clues).map(([id, clue]) => ({ id, name: nameOf(id), ...clue })).sort((a, b) => a.at - b.at);
  const isLast = round >= rounds.length - 1;
  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <GameHeader emoji={meta.emoji} name={meta.name} color={meta.color} subtitle={`Round ${round + 1} / ${rounds.length}`} />
      <div className="flex gap-2"><GuesserBadge color={meta.color} iAmGuesser={iAmGuesser} guesserName={guesserName} /><TeamPill teamScore={teamScore} totalRounds={rounds.length} /></div>

      <div className={`w-full max-w-xl bg-surface border-2 rounded-3xl p-8 text-center ib-pop ${guess?.correct ? '' : 'ib-shake'}`} style={{ borderColor: guess?.correct ? meta.color : '#ef4444' }}>
        <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-1">The word was</p>
        <h2 className="text-4xl font-black text-text mb-4">{word ?? '…'}</h2>
        <p className="text-lg font-bold" style={{ color: guess?.correct ? meta.color : '#ef4444' }}>
          {guess?.correct ? '✅ ' : '❌ '}
          {guesserName} {guess?.text ? <>said “{guess.text}”</> : 'passed'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 w-full max-w-3xl">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-3">Clues</p>
          {rows.length === 0 ? (
            <p className="text-text-muted italic text-sm">No clue made it in time.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row, i) => (
                <li key={row.id} className="flex items-center gap-3 ib-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
                  <span className="w-7 text-center text-lg">{row.kept ? '✓' : '🔥'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${row.kept ? 'text-text' : 'text-text-muted line-through'}`}>{row.text}</p>
                    <p className="text-xs text-text-muted truncate">{row.name}{row.reason ? ` · ${REASONS[row.reason]}` : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Team progress</p>
          <TeamTrack rounds={rounds} guesses={guesses} />
          <BurnedLine submissions={submissions} />
        </div>
      </div>

      <NextRoundButton isAdmin={isAdmin} color={meta.color} isLast={isLast} nextLabel="Next round" onAdvance={onAdvance} />
    </div>
  );
};

export default JustOneReveal;
