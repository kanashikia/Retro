
import React from 'react';
import { LayoutDashboard, Users, Sparkles, ChevronRight, Copy, LogOut, AlertCircle } from 'lucide-react';
import { SessionState, User, RetroPhase } from '../types';

interface Props {
  session: SessionState;
  currentUser: User;
  participants: User[];
  isLoading: boolean;
  error: string | null;
  onNextPhase: () => void;
  onReset: () => void;
}

const getUserColor = (name: string) => {
  const colors = [
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'bg-orange-100 text-orange-700 border-orange-200',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const BoardHeader: React.FC<Props> = ({ session, currentUser, participants, isLoading, error, onNextPhase, onReset }) => (
  <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner"><LayoutDashboard className="text-white w-5 h-5" /></div>
        <span className="font-black text-2xl text-slate-900 tracking-tight hidden sm:inline">Retro</span>
      </div>
      <div className="h-8 w-px bg-slate-200 hidden xs:block"></div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-sm font-bold text-indigo-700 border border-indigo-100 shadow-sm">
          <Users className="w-4 h-4" />
          <span>{currentUser.name}</span>
          {currentUser.isAdmin && <span className="bg-indigo-600 text-white text-[10px] uppercase px-1.5 py-0.5 rounded ml-1 font-black">Admin</span>}
        </div>

        <div className="flex items-center">
          <div className="flex -space-x-3 items-center">
            {participants.filter(p => p.id !== currentUser.id).slice(0, 5).map(p => (
              <div
                key={p.id}
                className={`w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-sm transition-transform hover:scale-110 hover:z-10 ${getUserColor(p.name)}`}
                title={p.name}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {participants.length > 6 && (
              <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 z-0 shadow-sm">
                +{participants.length - 6}
              </div>
            )}
          </div>
          <span className="ml-4 text-xs text-slate-400 font-semibold uppercase tracking-wider hidden sm:inline">
            {participants.length === 1 ? 'Only you' : `${participants.length} online`}
          </span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      {error && <div className="text-red-600 text-sm font-bold px-4 py-2 bg-red-50 rounded-lg flex items-center gap-2 animate-pulse"><AlertCircle className="w-4 h-4" /> {error}</div>}
      {currentUser.isAdmin && (
        <button onClick={onNextPhase} disabled={isLoading} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-base font-bold transition-all shadow-md active:scale-95 disabled:opacity-50">
          {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (session.phase === RetroPhase.BRAINSTORM ? <Sparkles className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />)}
          {session.phase === RetroPhase.BRAINSTORM ? "Group with AI" : "Next"}
        </button>
      )}
      <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors border border-transparent hover:border-slate-200" title="Copy share link"><Copy className="w-6 h-6" /></button>
      <button onClick={() => {
        if (currentUser.isAdmin) {
          if (window.confirm("Do you want to close this session for everyone? This will save it to your history.")) {
            onReset();
          }
        } else {
          onReset();
        }
      }} className="p-2.5 hover:bg-red-50 rounded-xl text-red-600 transition-colors border border-transparent hover:border-red-100" title="Leave session"><LogOut className="w-6 h-6" /></button>
    </div>
  </header>
);

export default BoardHeader;
