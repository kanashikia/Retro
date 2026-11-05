import React, { useEffect, useRef, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { IceBreakerGameId, SessionState, User } from '../types';
import {
  ICE_BREAKER_GAMES,
  GamePick,
  SPIN_REPLAY_WINDOW_MS,
  wheelGames,
  availableGames,
  getGameMeta,
  resolveGame,
} from '../icebreaker/games';
import GameSelect from './icebreaker/GameSelect';
import GameWheel from './icebreaker/GameWheel';
import WheelSetup from './icebreaker/WheelSetup';
import QuestionsGame from './icebreaker/QuestionsGame';
import EmojiCharadesGame from './icebreaker/EmojiCharadesGame';
import JustOneGame from './icebreaker/JustOneGame';
import WouldYouRatherGame from './icebreaker/WouldYouRatherGame';
import FakeDefinitionGame from './icebreaker/FakeDefinitionGame';
import AirHockeyGame from './icebreaker/AirHockeyGame';

interface Props {
  session: SessionState;
  currentUser: User;
  participants: User[];
  isAdmin: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onNext: () => void;
  onStartRetro: () => void;
  onSelectGame: (pick: GamePick) => void;
  onChangeGame: () => void;
  // generic game actions (emoji charades, later just one)
  isStarting: boolean;
  onStart: () => void;
  /** `onRejected` runs when the server refuses the submission, so the game can re-enable its input. */
  onSubmit: (text: string, onRejected: () => void) => void;
  onAdvance: () => void;
  /** Admin replaces the current question / charade / word / dilemma with a spare. */
  onSkip: () => void;
  /** Admin switches games in or out of the random wheel. */
  onSetExcludedGames: (excluded: IceBreakerGameId[]) => void;
}

// Orchestrates the ice breaker phase: game selection, the random wheel, then
// the chosen game. Game state itself lives in session.iceBreakerState.
const IceBreakerBoard: React.FC<Props> = ({
  session, currentUser, participants, isAdmin, isGenerating, onGenerate, onNext, onStartRetro, onSelectGame, onChangeGame,
  isStarting, onStart, onSubmit, onAdvance, onSkip, onSetExcludedGames
}) => {
  const state = session.iceBreakerState;
  const gameId = resolveGame(state);
  const spin = state?.spin;
  const excluded = state?.excludedGames ?? [];

  const [isSelecting, setIsSelecting] = useState(false);
  const [wheelTarget, setWheelTarget] = useState<typeof gameId>(null);
  // Admin is on the wheel screen, benching games before spinning.
  const [setupWheel, setSetupWheel] = useState(false);
  const seenSpinRef = useRef<string | null>(null);

  // Play the wheel once per spin id, and only if the spin is fresh enough that
  // we are not a late joiner catching up on old state.
  useEffect(() => {
    if (!spin || !gameId) return;
    if (seenSpinRef.current === spin.id) return;
    seenSpinRef.current = spin.id;
    if (Date.now() - spin.at <= SPIN_REPLAY_WINDOW_MS) {
      setWheelTarget(gameId);
    }
  }, [spin?.id, spin?.at, gameId]);

  // Selection is confirmed by the next session update.
  useEffect(() => { setIsSelecting(false); if (gameId) setSetupWheel(false); }, [gameId, spin?.id]);
  useEffect(() => {
    if (!isSelecting) return;
    const t = setTimeout(() => setIsSelecting(false), 6000);
    return () => clearTimeout(t);
  }, [isSelecting]);

  // Leaving a game that has started loses its progress: ask first.
  const [confirmChange, setConfirmChange] = useState(false);
  const step = state?.step;
  const questionsPending = gameId === 'questions' && (state?.questions?.length ?? 0) > 0
    && (state?.currentIndex ?? 0) < (state?.questions?.length ?? 0) - 1;
  // The questions game stays on step 'play' to the end: only its index tells if it is over
  const inProgress = gameId === 'questions'
    ? questionsPending
    : step === 'play' || step === 'collect' || step === 'reveal';
  const requestChangeGame = () => {
    if (inProgress) setConfirmChange(true);
    else onChangeGame();
  };
  useEffect(() => { setConfirmChange(false); }, [gameId]);

  const confirmDialog = confirmChange && (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="ib-confirm-title">
      <div className="bg-surface border border-border rounded-[28px] shadow-2xl w-full max-w-sm p-7 space-y-5 ib-pop">
        <div className="space-y-2">
          <h3 id="ib-confirm-title" className="text-xl font-black text-text">Switch game?</h3>
          <p className="text-text-muted text-sm leading-relaxed">The current game is not over. Its rounds and scores will be lost for everyone.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setConfirmChange(false)} className="flex-1 py-3 rounded-2xl border border-border text-text-muted font-bold hover:bg-secondary transition-colors">
            Keep playing
          </button>
          <button onClick={() => { setConfirmChange(false); onChangeGame(); }} className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold hover:bg-primary-hover transition-colors">
            Switch game
          </button>
        </div>
      </div>
    </div>
  );

  const handleSelect = (pick: GamePick) => {
    // Random opens the wheel screen first; the actual spin is a separate click.
    if (pick === 'random' && !setupWheel) {
      setSetupWheel(true);
      return;
    }
    setIsSelecting(true);
    onSelectGame(pick);
  };

  if (wheelTarget) {
    return (
      <GameWheel
        games={wheelGames(excluded)}
        targetId={wheelTarget}
        onDone={() => setWheelTarget(null)}
      />
    );
  }

  if (!gameId && setupWheel && isAdmin) {
    return (
      <WheelSetup
        games={availableGames()}
        excluded={excluded}
        isSpinning={isSelecting}
        onSetExcluded={onSetExcludedGames}
        onSpin={() => handleSelect('random')}
        onBack={() => setSetupWheel(false)}
      />
    );
  }

  if (!gameId) {
    return (
      <GameSelect
        games={ICE_BREAKER_GAMES}
        participants={participants}
        isAdmin={isAdmin}
        isSelecting={isSelecting}
        onSelect={handleSelect}
        excluded={excluded}
      />
    );
  }

  if (gameId === 'questions') {
    return (<>
      <QuestionsGame
        session={session}
        participants={participants}
        isAdmin={isAdmin}
        isGenerating={isGenerating}
        onGenerate={onGenerate}
        onNext={onNext}
        onStartRetro={onStartRetro}
        onChangeGame={requestChangeGame}
        onSkip={onSkip}
      />
      {confirmDialog}
    </>
    );
  }

  if (gameId === 'emoji') {
    return (<>
      <EmojiCharadesGame
        session={session}
        currentUser={currentUser}
        participants={participants}
        isAdmin={isAdmin}
        isStarting={isStarting}
        onStart={onStart}
        onSubmit={onSubmit}
        onAdvance={onAdvance}
        onStartRetro={onStartRetro}
        onChangeGame={requestChangeGame}
        onSkip={onSkip}
      />
      {confirmDialog}
    </>
    );
  }

  if (gameId === 'justone') {
    return (<>
      <JustOneGame
        session={session}
        currentUser={currentUser}
        participants={participants}
        isAdmin={isAdmin}
        isStarting={isStarting}
        onStart={onStart}
        onSubmit={onSubmit}
        onAdvance={onAdvance}
        onStartRetro={onStartRetro}
        onChangeGame={requestChangeGame}
        onSkip={onSkip}
      />
      {confirmDialog}
    </>
    );
  }

  if (gameId === 'wyr') {
    return (<>
      <WouldYouRatherGame
        session={session}
        currentUser={currentUser}
        participants={participants}
        isAdmin={isAdmin}
        isStarting={isStarting}
        onStart={onStart}
        onSubmit={onSubmit}
        onAdvance={onAdvance}
        onStartRetro={onStartRetro}
        onChangeGame={requestChangeGame}
        onSkip={onSkip}
      />
      {confirmDialog}
    </>
    );
  }

  if (gameId === 'fakedef') {
    return (<>
      <FakeDefinitionGame
        session={session}
        currentUser={currentUser}
        participants={participants}
        isAdmin={isAdmin}
        isStarting={isStarting}
        onStart={onStart}
        onSubmit={onSubmit}
        onAdvance={onAdvance}
        onStartRetro={onStartRetro}
        onChangeGame={requestChangeGame}
        onSkip={onSkip}
      />
      {confirmDialog}
    </>
    );
  }

  if (gameId === 'airhockey') {
    return (<>
      <AirHockeyGame
        session={session}
        currentUser={currentUser}
        participants={participants}
        isAdmin={isAdmin}
        isStarting={isStarting}
        onStart={onStart}
        onStartRetro={onStartRetro}
        onChangeGame={requestChangeGame}
      />
      {confirmDialog}
    </>
    );
  }

  // A game the server knows but this client cannot render yet.
  const meta = getGameMeta(gameId);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="text-6xl">{meta?.emoji ?? '🎮'}</div>
      <h2 className="text-3xl font-black text-text">{meta?.name ?? 'Unknown game'}</h2>
      <p className="text-text-muted">This game is not available in your version of the app yet.</p>
      {isAdmin && (
        <button
          onClick={onChangeGame}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all"
        >
          <Shuffle className="w-4 h-4" /> Pick another game
        </button>
      )}
    </div>
  );
};

export default IceBreakerBoard;
