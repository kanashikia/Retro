import React, { useEffect, useMemo, useRef } from 'react';
import { IceBreakerSubmission, SessionState, User } from '../../types';
import { getGameMeta } from '../../icebreaker/games';
import { GameLobby, useCountdown } from './shared';
import EmojiPlay from './emoji/EmojiPlay';
import EmojiReveal from './emoji/EmojiReveal';
import EmojiResults from './emoji/EmojiResults';

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

const META = getGameMeta('emoji')!;
export const EMOJI_ROUND_SECONDS = 30;

const EmojiCharadesGame: React.FC<Props> = ({
  session, currentUser, participants, isAdmin, isStarting, onStart, onSubmit, onAdvance, onStartRetro, onChangeGame, onSkip
}) => {
  const state = session.iceBreakerState;
  const step = state?.step ?? 'lobby';
  const round = state?.round ?? 0;
  const charades = state?.charades ?? [];
  const charade = charades[round];
  const roundSubmissions: Record<string, IceBreakerSubmission> = state?.submissions?.[String(round)] ?? {};
  const me = String(currentUser.id);
  const remaining = useCountdown(step === 'play' ? state?.roundStartedAt : undefined, EMOJI_ROUND_SECONDS);

  const nameOf = (id: string) => state?.players?.[id] ?? participants.find(p => String(p.id) === id)?.name ?? 'Someone';

  const leaderboard = useMemo(() => {
    const ids = new Set<string>([...participants.map(p => String(p.id)), ...Object.keys(state?.scores ?? {})]);
    return Array.from(ids)
      .map(id => ({ id, name: nameOf(id), score: state?.scores?.[id] ?? 0 }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, state?.scores, state?.players]);

  // Admin's screen ends the round when the clock hits zero, once per round.
  const autoAdvancedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isAdmin || step !== 'play' || remaining > 0) return;
    if (autoAdvancedRef.current === round) return;
    autoAdvancedRef.current = round;
    onAdvance();
  }, [isAdmin, step, remaining, round, onAdvance]);

  if (step === 'lobby' || charades.length === 0) {
    return (
      <GameLobby
        meta={META}
        description="Guess the movie or series behind three emojis. One guess per round, and the faster you answer, the more points you score."
        startingLabel="Preparing charades..."
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
      <EmojiResults
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
      <EmojiReveal
        meta={META}
        round={round}
        totalRounds={charades.length}
        charade={charade}
        submissions={roundSubmissions}
        nameOf={nameOf}
        leaderboard={leaderboard}
        me={me}
        isAdmin={isAdmin}
        onAdvance={onAdvance}
      />
    );
  }

  return (
    <EmojiPlay
      meta={META}
      round={round}
      totalRounds={charades.length}
      charade={charade}
      submissions={roundSubmissions}
      participants={participants}
      me={me}
      remaining={remaining}
      totalSeconds={EMOJI_ROUND_SECONDS}
      isAdmin={isAdmin}
      onSubmit={onSubmit}
      onAdvance={onAdvance}
      onSkip={onSkip}
      onChangeGame={onChangeGame}
    />
  );
};

export default EmojiCharadesGame;
