import React, { useEffect, useRef } from 'react';
import { IceBreakerSubmission, SessionState, User } from '../../types';
import { getGameMeta } from '../../icebreaker/games';
import { GameLobby, useCountdown } from './shared';
import JustOneClues from './justone/JustOneClues';
import JustOneGuess from './justone/JustOneGuess';
import JustOneReveal from './justone/JustOneReveal';
import JustOneResults from './justone/JustOneResults';

interface Props {
  session: SessionState;
  currentUser: User;
  participants: User[];
  isAdmin: boolean;
  isStarting: boolean;
  onStart: () => void;
  onSubmit: (text: string, onRejected: () => void) => void;
  onAdvance: () => void;
  onStartRetro: () => void;
  onChangeGame: () => void;
  onSkip: () => void;
}

const META = getGameMeta('justone')!;
export const JUSTONE_COLLECT_SECONDS = 30;
export const JUSTONE_GUESS_SECONDS = 45;

const JustOneGame: React.FC<Props> = ({
  session, currentUser, participants, isAdmin, isStarting, onStart, onSubmit, onAdvance, onStartRetro, onChangeGame, onSkip
}) => {
  const state = session.iceBreakerState;
  const step = state?.step ?? 'lobby';
  const round = state?.round ?? 0;
  const rounds = state?.words ?? [];
  const current = rounds[round];
  const me = String(currentUser.id);
  const guesserId = current ? String(current.guesserId) : '';
  const iAmGuesser = guesserId === me;
  const submissions = state?.submissions ?? {};
  const clues: Record<string, IceBreakerSubmission> = submissions[String(round)] ?? {};
  const guesses = state?.guesses;
  const teamScore = state?.teamScore ?? 0;

  const nameOf = (id: string) => state?.players?.[id] ?? participants.find(p => String(p.id) === id)?.name ?? 'Someone';
  const guesserName = nameOf(guesserId);
  const totalSeconds = step === 'play' ? JUSTONE_GUESS_SECONDS : JUSTONE_COLLECT_SECONDS;
  const remaining = useCountdown(step === 'collect' || step === 'play' ? state?.roundStartedAt : undefined, totalSeconds);

  // Admin's screen closes the step when the clock hits zero, once per step.
  const autoAdvancedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isAdmin || (step !== 'collect' && step !== 'play') || remaining > 0) return;
    const key = `${round}:${step}`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    onAdvance();
  }, [isAdmin, step, remaining, round, onAdvance]);

  if (step === 'lobby' || rounds.length === 0) {
    return (
      <GameLobby
        meta={META}
        description="One player must guess a secret word. Everyone else sees it and writes a one-word clue. Identical clues are removed and burned. You win as a team."
        startingLabel="Picking words..."
        minPlayers={2}
        participants={participants}
        isAdmin={isAdmin}
        isStarting={isStarting}
        onStart={onStart}
        onChangeGame={onChangeGame}
      />
    );
  }

  if (step === 'done') {
    return (
      <JustOneResults
        meta={META}
        rounds={rounds}
        guesses={guesses}
        submissions={submissions}
        teamScore={teamScore}
        nameOf={nameOf}
        isAdmin={isAdmin}
        onStartRetro={onStartRetro}
        onChangeGame={onChangeGame}
      />
    );
  }

  if (step === 'reveal') {
    return (
      <JustOneReveal
        meta={META}
        round={round}
        rounds={rounds}
        word={current?.word}
        guesses={guesses}
        guess={guesses?.[String(round)]}
        submissions={submissions}
        clues={clues}
        teamScore={teamScore}
        iAmGuesser={iAmGuesser}
        guesserName={guesserName}
        nameOf={nameOf}
        isAdmin={isAdmin}
        onAdvance={onAdvance}
      />
    );
  }

  const roundProps = {
    meta: META,
    round,
    totalRounds: rounds.length,
    word: current?.word,
    clues,
    iAmGuesser,
    guesserName,
    remaining,
    totalSeconds,
    isAdmin,
    onSubmit,
    onAdvance,
    onSkip,
    onChangeGame,
  };

  if (step === 'collect') {
    return (
      <JustOneClues
        {...roundProps}
        writers={participants.filter(p => String(p.id) !== guesserId)}
        myClue={clues[me]}
      />
    );
  }

  return <JustOneGuess {...roundProps} nameOf={nameOf} />;
};

export default JustOneGame;
