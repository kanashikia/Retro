
import React from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard, Vote } from 'lucide-react';
import { SessionState, User } from '../types';

interface Props {
  session: SessionState;
  currentUser: User;
  onUpdateSession: (s: SessionState) => void;
}

const DiscussionBoard: React.FC<Props> = ({ session, currentUser, onUpdateSession }) => {
  const currentTheme = (session.themes || [])[session.currentThemeIndex];

  if (!currentTheme) return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-20">
      <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center"><LayoutDashboard className="w-12 h-12 text-slate-300" /></div>
      <h3 className="text-3xl font-black text-slate-800">No themes identified.</h3>
      <p className="text-slate-500 max-w-md">The AI couldn't create any themes. Make sure you grouped the cards correctly.</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col gap-10 py-6">
      <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-6">
        <div className="flex items-center justify-center gap-4">
          <div className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 text-sm font-black rounded-xl uppercase tracking-widest border border-indigo-200">
            Topic {session.currentThemeIndex + 1} of {(session.themes || []).length}
          </div>
          <div className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-700 text-sm font-black rounded-xl uppercase tracking-widest border border-emerald-200 gap-2">
            <Vote className="w-4 h-4" /> {currentTheme.votes} Votes
          </div>
        </div>
        <h2 className="text-6xl font-black text-slate-900 tracking-tight leading-none">{currentTheme.name}</h2>
        <p className="text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">{currentTheme.description}</p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-4 no-scrollbar pb-10">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-4">Cards linked to this theme</h3>
        {(session.tickets || [])
          .filter(t => t.themeId === currentTheme.id)
          .map(t => (
            <div key={t.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-start gap-8 hover:border-indigo-200 transition-all group">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                <span className="text-lg font-black text-slate-300 group-hover:text-indigo-600 leading-none">#</span>
              </div>
              <div className="flex-1 space-y-3 pt-1">
                <p className="text-slate-900 text-xl md:text-2xl font-semibold leading-relaxed">{t.text}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 font-bold uppercase tracking-tighter">
                    {t.column} • Shared by <span className="text-slate-800">{t.author}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>

      {currentUser.isAdmin && (
        <div className="flex items-center justify-center gap-8 py-6 sticky bottom-0 bg-slate-50/80 backdrop-blur-md border-t border-slate-200">
          <button
            disabled={session.currentThemeIndex === 0}
            onClick={() => onUpdateSession({ ...session, currentThemeIndex: session.currentThemeIndex - 1 })}
            className="flex items-center gap-3 px-10 py-5 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-30 shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-7 h-7" /> Previous
          </button>
          <button
            disabled={session.currentThemeIndex === (session.themes || []).length - 1}
            onClick={() => onUpdateSession({ ...session, currentThemeIndex: session.currentThemeIndex + 1 })}
            className="flex items-center gap-3 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all disabled:opacity-30 shadow-xl shadow-indigo-100 active:scale-95"
          >
            Next Topic <ChevronRight className="w-7 h-7" />
          </button>
        </div>
      )}
    </div>
  );
};

export default DiscussionBoard;
