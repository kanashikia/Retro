import React, { useEffect, useRef } from 'react';
import { FakeDefBallot, IceBreakerSubmission, SessionState, User } from '../../types';
import { getGameMeta } from '../../icebreaker/games';
import { GameLobby, useCountdown } from './shared';
import FakeDefWriting from './fakedef/FakeDefWriting';
import FakeDefVote from './fakedef/FakeDefVote';
import FakeDefReveal from './fakedef/FakeDefReveal';
import FakeDefResults from './fakedef/FakeDefResults';

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

const META = getGameMeta('fakedef')!;
export const FAKEDEF_COLLECT_SECONDS = 60;
export const FAKEDEF_VOTE_SECONDS = 45;

const FakeDefinitionGame: React.FC<Props> = ({
  session, currentUser, participants, isAdmin, isStarting, onStart, onSubmit, onAdvance, onStartRetro, onChangeGame, onSkip
}) => {
  const state = session.iceBreakerState;
  const step = state?.step ?? 'lobby';
  const round = state?.round ?? 0;
  const rounds = state?.words ?? [];
  const current = rounds[round];
  const me = String(currentUser.id);
  const submissions: Record<string, IceBreakerSubmission> = state?.submissions?.[String(round)] ?? {};
  const ballots: FakeDefBallot[] = state?.ballots?.[String(round)] ?? [];
  const votes = state?.votes?.[String(round)] ?? {};
  const totalSeconds = step === 'play' ? FAKEDEF_VOTE_SECONDS : FAKEDEF_COLLECT_SECONDS;
  const remaining = useCountdown(step === 'collect' || step === 'play' ? state?.roundStartedAt : undefined, totalSeconds);

  const nameOf = (id: string) => state?.players?.[id] ?? participants.find(p => String(p.id) === id)?.name ?? 'Someone';

  const leaderboard = [...new Set([...participants.map(p => String(p.id)), ...Object.keys(state?.scores ?? {})])]
    .map(id => ({ id, name: nameOf(id), score: state?.scores?.[id] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

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
        description="A rare word nobody knows. Everyone invents a definition, then votes for the one they believe is real. Fool your colleagues, spot the truth."
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
      <FakeDefResults
        meta={META}
        leaderboard={leaderboard}
        winnerName={state?.winnerName}
        me={me}
        isAdmin={isAdmin}
        onStartRetro={onStartRetro}
        onChangeGame={onChangeGame}
      />
    );
  }

  if (step === 'reveal') {
    return (
      <FakeDefReveal
        meta={META}
        round={round}
        totalRounds={rounds.length}
        word={current?.word}
        definition={current?.definition}
        ballots={ballots}
        votes={votes}
        nameOf={nameOf}
        leaderboard={leaderboard}
        me={me}
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
    participants,
    me,
    remaining,
    totalSeconds,
    isAdmin,
    onSubmit,
    onAdvance,
    onSkip,
    onChangeGame,
  };

  if (step === 'collect') return <FakeDefWriting {...roundProps} submissions={submissions} />;

  return <FakeDefVote {...roundProps} ballots={ballots} votes={votes} myText={submissions[me]?.text} />;
};

export default FakeDefinitionGame;
