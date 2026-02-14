
import React from 'react';
import { RetroPhase } from '../types';
import { BrainCircuit, LayoutDashboard, Vote, MessagesSquare } from 'lucide-react';

interface Props {
  currentPhase: RetroPhase;
  isAdmin: boolean;
  onPhaseChange: (phase: RetroPhase) => void;
}

const PhaseStepper: React.FC<Props> = ({ currentPhase, isAdmin, onPhaseChange }) => {
  const steps = [
    { id: RetroPhase.BRAINSTORM, icon: <BrainCircuit className="w-5 h-5" />, label: "Brainstorm" },
    { id: RetroPhase.GROUPING, icon: <LayoutDashboard className="w-5 h-5" />, label: "Grouping" },
    { id: RetroPhase.VOTING, icon: <Vote className="w-5 h-5" />, label: "Voting" },
    { id: RetroPhase.DISCUSSION, icon: <MessagesSquare className="w-5 h-5" />, label: "Discussion" },
  ];

  return (
    <nav className="bg-surface/80 backdrop-blur-md border-b border-border px-6 py-4 overflow-x-auto no-scrollbar shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-center gap-10 min-w-max">
        {steps.map((p, idx) => (
          <button
            key={p.id}
            disabled={!isAdmin}
            onClick={() => onPhaseChange(p.id)}
            className={`flex items-center gap-3 text-base font-bold transition-all relative pb-2 pt-1 group
              ${currentPhase === p.id ? 'text-primary' : 'text-text-muted hover:text-text disabled:hover:text-text-muted'}
              ${isAdmin ? 'cursor-pointer' : 'cursor-default'}
            `}
          >
            <span className={`p-1.5 rounded-lg transition-colors ${currentPhase === p.id ? 'bg-primary/10 text-primary' : 'bg-secondary/50 text-text-muted group-hover:bg-secondary group-hover:text-text'}`}>
              {p.icon}
            </span>
            <span>{idx + 1}. {p.label}</span>
            {currentPhase === p.id && <div className="h-1 w-full bg-primary absolute bottom-[-16px] left-0 rounded-full animate-in fade-in zoom-in-75"></div>}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default PhaseStepper;
