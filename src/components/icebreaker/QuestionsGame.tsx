import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Sparkles, Shuffle, SkipForward } from 'lucide-react';
import { IceBreakerQuestion, SessionState, User } from '../../types';
import { getGameMeta } from '../../icebreaker/games';
import { EndOfGameActions, PlayersPanel } from './shared';

interface Props {
  session: SessionState;
  participants: User[];
  isAdmin: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onNext: () => void;
  onStartRetro: () => void;
  onChangeGame: () => void;
  onSkip: () => void;
}

const SPIN_STEPS = [
  ...Array(10).fill(55),
  ...Array(8).fill(85),
  ...Array(6).fill(120),
  ...Array(4).fill(190),
  ...Array(3).fill(280),
];

const META = getGameMeta('questions')!;

// Spins through the names before landing on the person at currentIndex.
const useNameRoulette = (questions: IceBreakerQuestion[], currentIndex: number) => {
  const [displayedName, setDisplayedName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const prevIndexRef = useRef<number | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (questions.length === 0) return;

    const target = questions[currentIndex];
    if (!target) return;

    // On first mount, restore current state without animation
    if (prevIndexRef.current === null) {
      prevIndexRef.current = currentIndex;
      setDisplayedName(target.participantName);
      setShowQuestion(true);
      setRevealed(true);
      return;
    }

    if (prevIndexRef.current === currentIndex) return;
    prevIndexRef.current = currentIndex;

    // Clear any pending timeouts from a previous spin
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    setIsSpinning(true);
    setShowQuestion(false);
    setRevealed(false);

    const allNames = questions.map(q => q.participantName);
    let elapsed = 0;

    SPIN_STEPS.forEach((delay, i) => {
      elapsed += delay;
      const t = setTimeout(() => {
        if (i < SPIN_STEPS.length - 1) {
          const random = allNames[Math.floor(Math.random() * allNames.length)];
          setDisplayedName(random);
        } else {
          setDisplayedName(target.participantName);
          setIsSpinning(false);
          const t2 = setTimeout(() => setRevealed(true), 80);
          const t3 = setTimeout(() => setShowQuestion(true), 380);
          timeoutsRef.current.push(t2, t3);
        }
      }, elapsed);
      timeoutsRef.current.push(t);
    });

    return () => timeoutsRef.current.forEach(clearTimeout);
  }, [currentIndex, questions]);

  return { displayedName, isSpinning, showQuestion, revealed };
};

const QuestionsLobby: React.FC<{
  participants: User[];
  isAdmin: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onChangeGame: () => void;
}> = ({ participants, isAdmin, isGenerating, onGenerate, onChangeGame }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center">
    <div className="space-y-3 ib-fade-up">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-4xl ib-float"
        style={{ background: `${META.color}22` }}
      >
        {META.emoji}
      </div>
      <h2 className="text-3xl font-black text-text">{META.name}</h2>
      <p className="text-text-muted max-w-md mx-auto leading-relaxed">
        Warm up the team with a fun round of questions before the retro begins.
      </p>
    </div>

    <PlayersPanel participants={participants} emptyText="Waiting for players to join..." />

    {isAdmin ? (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onGenerate}
          disabled={isGenerating || participants.length === 0}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-hover transition-all disabled:opacity-50 text-lg shadow-lg shadow-primary/20 active:scale-[0.98]"
        >
          <Sparkles className="w-5 h-5" />
          {isGenerating ? 'Generating questions...' : 'Generate Questions'}
        </button>
        <button
          onClick={onChangeGame}
          disabled={isGenerating}
          className="flex items-center gap-1.5 text-sm font-bold text-text-muted hover:text-text transition-colors disabled:opacity-50"
        >
          <Shuffle className="w-4 h-4" /> Change game
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-3 text-text-muted">
        <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
        <span className="italic">Waiting for the admin to generate questions...</span>
      </div>
    )}
  </div>
);

const ProgressDots: React.FC<{ count: number; currentIndex: number }> = ({ count, currentIndex }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className={`rounded-full transition-all duration-300 ${
          i < currentIndex
            ? 'w-2.5 h-2.5 bg-primary/40'
            : i === currentIndex
            ? 'w-4 h-4 bg-primary shadow-lg shadow-primary/40'
            : 'w-2.5 h-2.5 bg-border'
        }`}
      />
    ))}
    <span className="text-sm text-text-muted font-medium ml-2">
      {currentIndex + 1} / {count}
    </span>
  </div>
);

const NameCard: React.FC<{ name: string; isSpinning: boolean; revealed: boolean; isDone: boolean }> = ({ name, isSpinning, revealed, isDone }) => (
  <div className={`
    w-full rounded-3xl p-10 text-center border-2 transition-all duration-500
    ${isSpinning
      ? 'border-primary/20 bg-primary/5 shadow-none'
      : revealed
      ? 'border-primary bg-surface shadow-2xl shadow-primary/15'
      : 'border-border bg-surface'
    }
  `}>
    <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-4">
      {isSpinning ? '🎰  Picking someone...' : isDone && !isSpinning ? '🏁  Last one!' : '🎯  It\'s your turn!'}
    </p>

    <div
      className={`text-5xl font-black transition-all duration-300 ${
        isSpinning
          ? 'text-text/40 blur-sm scale-95'
          : revealed
          ? 'text-primary scale-110'
          : 'text-text scale-100'
      }`}
      style={{ transition: isSpinning ? 'none' : 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >
      {name || '...'}
    </div>
  </div>
);

const QuestionCard: React.FC<{ question: string; isAdmin: boolean; onSkip: () => void }> = ({ question, isAdmin, onSkip }) => (
  <div className="relative w-full bg-surface border border-border rounded-2xl p-6 text-center animate-in fade-in slide-in-from-bottom-3 duration-400">
    <p className="text-xs font-black text-primary uppercase tracking-[0.15em] mb-3">Question</p>
    <p className="text-xl font-bold text-text leading-snug">{question}</p>
    {isAdmin && (
      <button
        onClick={onSkip}
        title="Swap this question for another one"
        className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-bold text-text-muted hover:text-text px-2 py-1 rounded-lg hover:bg-secondary transition-colors"
      >
        <SkipForward className="w-3.5 h-3.5" /> Skip
      </button>
    )}
  </div>
);

const NextPersonActions: React.FC<{ onNext: () => void; onChangeGame: () => void }> = ({ onNext, onChangeGame }) => (
  <div className="flex flex-col items-center gap-3">
    <button
      onClick={onNext}
      className="flex items-center gap-2 px-8 py-4 bg-surface border-2 border-primary text-primary font-bold rounded-2xl hover:bg-primary hover:text-white transition-all text-lg active:scale-[0.98]"
    >
      Next Person
      <ChevronRight className="w-5 h-5" />
    </button>
    <button
      onClick={onChangeGame}
      className="flex items-center gap-1.5 text-sm font-bold text-text-muted hover:text-text transition-colors"
    >
      <Shuffle className="w-4 h-4" /> Change game
    </button>
  </div>
);

// The original ice breaker: a name roulette plus one Gemini question per person.
const QuestionsGame: React.FC<Props> = ({
  session, participants, isAdmin, isGenerating, onGenerate, onNext, onStartRetro, onChangeGame, onSkip
}) => {
  const iceBreaker = session.iceBreakerState;
  const questions = iceBreaker?.questions ?? [];
  const currentIndex = iceBreaker?.currentIndex ?? 0;
  const { displayedName, isSpinning, showQuestion, revealed } = useNameRoulette(questions, currentIndex);

  const currentQuestion = questions[currentIndex];
  const isDone = questions.length > 0 && currentIndex >= questions.length - 1 && showQuestion;

  if (questions.length === 0) {
    return (
      <QuestionsLobby
        participants={participants}
        isAdmin={isAdmin}
        isGenerating={isGenerating}
        onGenerate={onGenerate}
        onChangeGame={onChangeGame}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <ProgressDots count={questions.length} currentIndex={currentIndex} />

      <div className="flex flex-col items-center gap-5 w-full max-w-xl">
        <NameCard name={displayedName} isSpinning={isSpinning} revealed={revealed} isDone={isDone} />
        {showQuestion && currentQuestion && <QuestionCard question={currentQuestion.question} isAdmin={isAdmin} onSkip={onSkip} />}
      </div>

      {isAdmin && !isSpinning && showQuestion && (
        <div className="animate-in fade-in duration-300">
          {isDone
            ? <EndOfGameActions isAdmin onStartRetro={onStartRetro} onChangeGame={onChangeGame} />
            : <NextPersonActions onNext={onNext} onChangeGame={onChangeGame} />}
        </div>
      )}

      {!isAdmin && isDone && (
        <p className="text-text-muted italic text-sm">
          Ice breaker complete! Waiting for the admin to start the retro...
        </p>
      )}
    </div>
  );
};

export default QuestionsGame;
