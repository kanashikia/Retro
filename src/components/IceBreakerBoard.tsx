import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Sparkles, Users, Trophy, Snowflake } from 'lucide-react';
import { SessionState, User } from '../types';

interface Props {
  session: SessionState;
  currentUser: User;
  participants: User[];
  isAdmin: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onNext: () => void;
  onStartRetro: () => void;
}

const SPIN_STEPS = [
  ...Array(10).fill(55),
  ...Array(8).fill(85),
  ...Array(6).fill(120),
  ...Array(4).fill(190),
  ...Array(3).fill(280),
];

const IceBreakerBoard: React.FC<Props> = ({
  session, participants, isAdmin, isGenerating, onGenerate, onNext, onStartRetro
}) => {
  const iceBreaker = session.iceBreakerState;
  const questions = iceBreaker?.questions ?? [];
  const currentIndex = iceBreaker?.currentIndex ?? 0;

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

  const currentQuestion = questions[currentIndex];
  const isDone = questions.length > 0 && currentIndex >= questions.length - 1 && showQuestion;

  // No questions yet — waiting room
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center">
        <div className="space-y-3">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
            <Snowflake className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-text">Ice Breaker</h2>
          <p className="text-text-muted max-w-md mx-auto leading-relaxed">
            Warm up the team with a fun round of questions before the retro begins.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md space-y-4 text-left">
          <h3 className="font-bold text-text flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Participants ({participants.length})
          </h3>
          {participants.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {participants.map(p => (
                <span key={p.id} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold">
                  {p.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm italic">Waiting for participants to join...</p>
          )}
        </div>

        {isAdmin ? (
          <button
            onClick={onGenerate}
            disabled={isGenerating || participants.length === 0}
            className="flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-hover transition-all disabled:opacity-50 text-lg shadow-lg shadow-primary/20 active:scale-[0.98]"
          >
            <Sparkles className="w-5 h-5" />
            {isGenerating ? 'Generating questions...' : 'Generate Questions'}
          </button>
        ) : (
          <div className="flex items-center gap-3 text-text-muted">
            <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
            <span className="italic">Waiting for the admin to generate questions...</span>
          </div>
        )}
      </div>
    );
  }

  // Main roulette view
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {questions.map((_, i) => (
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
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <div className="flex flex-col items-center gap-5 w-full max-w-xl">
        {/* Name roulette card */}
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
            {displayedName || '...'}
          </div>
        </div>

        {/* Question card */}
        {showQuestion && currentQuestion && (
          <div className="w-full bg-surface border border-border rounded-2xl p-6 text-center animate-in fade-in slide-in-from-bottom-3 duration-400">
            <p className="text-xs font-black text-primary uppercase tracking-[0.15em] mb-3">Question</p>
            <p className="text-xl font-bold text-text leading-snug">{currentQuestion.question}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      {isAdmin && !isSpinning && showQuestion && (
        <div className="animate-in fade-in duration-300">
          {isDone ? (
            <button
              onClick={onStartRetro}
              className="flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-hover transition-all text-lg shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              <Trophy className="w-5 h-5" />
              Start Retro
            </button>
          ) : (
            <button
              onClick={onNext}
              className="flex items-center gap-2 px-8 py-4 bg-surface border-2 border-primary text-primary font-bold rounded-2xl hover:bg-primary hover:text-white transition-all text-lg active:scale-[0.98]"
            >
              Next Person
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
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

export default IceBreakerBoard;
