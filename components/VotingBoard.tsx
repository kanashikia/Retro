
import React from 'react';
import { Vote, Plus } from 'lucide-react';
import { SessionState, User } from '../types';
import { getColumnColorClass } from '../utils/colors';

interface Props {
  session: SessionState;
  currentUser: User;
  onUpdateSession: (s: SessionState) => void;
  onUpdateUser: (u: User) => void;
}

const VotingBoard: React.FC<Props> = ({ session, currentUser, onUpdateSession, onUpdateUser }) => {
  const handleVote = (themeId: string) => {
    if (currentUser.votesRemaining <= 0) return;

    onUpdateSession({
      ...session,
      themes: (session.themes || []).map(t => t.id === themeId ? {
        ...t,
        votes: t.votes + 1,
        voterIds: [...t.voterIds, currentUser.id]
      } : t)
    });

    onUpdateUser({ ...currentUser, votesRemaining: currentUser.votesRemaining - 1 });
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-900">Theme Prioritization</h2>
        <div className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-lg shadow-indigo-200 animate-pulse">
          <Vote className="w-7 h-7" />
          <span>You have {currentUser.votesRemaining} votes left</span>
        </div>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          Vote for the themes that seem most important to discuss.
          You can cast multiple votes on the same theme.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(session.themes || []).map(theme => (
          <div key={theme.id} className={`bg-white rounded-[2rem] border-2 p-8 space-y-6 flex flex-col transition-all hover:shadow-xl ${theme.voterIds.includes(currentUser.id) ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-black text-2xl text-slate-900">{theme.name}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{theme.description}</p>
              </div>
              <div className="text-center shrink-0">
                <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100">
                  <span className="block text-3xl font-black leading-none">
                    {theme.voterIds.filter(id => id === currentUser.id).length}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Your Votes</span>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-slate-50/50 rounded-2xl p-4 space-y-3 max-h-[300px] overflow-y-auto no-scrollbar border border-slate-100/50">
              {(session.tickets || []).filter(t => t.themeId === theme.id).map(t => (
                <div key={t.id} className={`bg-white p-4 rounded-xl border-2 text-sm md:text-base text-slate-700 shadow-sm leading-relaxed ${getColumnColorClass(t.column)}`}>
                  {t.text}
                </div>
              ))}
            </div>

            <button
              disabled={currentUser.votesRemaining <= 0}
              onClick={() => handleVote(theme.id)}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all shadow-md active:scale-[0.97] disabled:opacity-20 flex items-center justify-center gap-3"
            >
              <Plus className="w-6 h-6" /> Vote for this group
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VotingBoard;
