import React, { useEffect, useRef } from 'react';
import { IceBreakerSubmission, SessionState, User } from '../../types';
import { getGameMeta } from '../../icebreaker/games';
import { GameLobby, useCountdown } from './shared';
import WyrPlay from './wyr/WyrPlay';
import WyrReveal from './wyr/WyrReveal';
import WyrResults from './wyr/WyrResults';

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

const META = getGameMeta('wyr')!;
export const WYR_ROUND_SECONDS = 20;

const WouldYouRatherGame: React.FC<Props> = ({
  session, currentUser, participants, isAdmin, isStarting, onStart, onSubmit, onAdvance, onStartRetro, onChangeGame, onSkip
}) => {
  const state = session.iceBreakerState;
  const step = state?.step ?? 'lobby';
  const round = state?.round ?? 0;
  const dilemmas = state?.dilemmas ?? [];
  const dilemma = dilemmas[round];
  const votes: Record<string, IceBreakerSubmission> = state?.submissions?.[String(round)] ?? {};
  const remaining = useCountdown(step === 'play' ? state?.roundStartedAt : undefined, WYR_ROUND_SECONDS);

  const nameOf = (id: string) => state?.players?.[id] ?? participants.find(p => String(p.id) === id)?.name ?? 'Someone';

  // Admin's screen closes the vote when the clock hits zero, once per round.
  const autoAdvancedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isAdmin || step !== 'play' || remaining > 0) return;
    if (autoAdvancedRef.current === round) return;
    autoAdvancedRef.current = round;
    onAdvance();
  }, [isAdmin, step, remaining, round, onAdvance]);

  if (step === 'lobby' || dilemmas.length === 0) {
    return (
      <GameLobby
        meta={META}
        description="Two options, you must pick one. Then see where everyone else stands, and argue about it."
        startingLabel="Picking dilemmas..."
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
      <WyrResults
        meta={META}
        dilemmas={dilemmas}
        submissions={state?.submissions ?? {}}
        nameOf={nameOf}
        isAdmin={isAdmin}
        onStartRetro={onStartRetro}
        onChangeGame={onChangeGame}
      />
    );
  }

  if (step === 'reveal') {
    return (
      <WyrReveal
        meta={META}
        round={round}
        dilemmas={dilemmas}
        dilemma={dilemma}
        votes={votes}
        nameOf={nameOf}
        isAdmin={isAdmin}
        onAdvance={onAdvance}
      />
    );
  }

  return (
    <WyrPlay
      meta={META}
      round={round}
      dilemmas={dilemmas}
      dilemma={dilemma}
      votes={votes}
      participants={participants}
      me={String(currentUser.id)}
      remaining={remaining}
      totalSeconds={WYR_ROUND_SECONDS}
      isAdmin={isAdmin}
      onSubmit={onSubmit}
      onAdvance={onAdvance}
      onSkip={onSkip}
      onChangeGame={onChangeGame}
    />
  );
};

export default WouldYouRatherGame;
