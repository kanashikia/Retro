
import React from 'react';
import { Vote, Plus } from 'lucide-react';
import { SessionState, User } from '../types';
import { getColumnColorClass } from '../utils/colors';
import ReactionBadge from './ReactionBadge';
import ReactionPicker from './ReactionPicker';

interface Props {
  session: SessionState;
  currentUser: User;
  onUpdateSession: (s: SessionState) => void;
  onUpdateUser: (u: User) => void;
  onToggleReaction: (ticketId: string, emoji: string) => void;
}

const VotingBoard: React.FC<Props> = ({ session, currentUser, onUpdateSession, onUpdateUser, onToggleReaction }) => {
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
        <h2 className="text-4xl font-black text-text">Theme Prioritization</h2>
        <div className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-xl shadow-lg shadow-primary/30 animate-pulse">
          <Vote className="w-7 h-7" />
          <span>You have {currentUser.votesRemaining} votes left</span>
        </div>
        <p className="text-text-muted text-lg max-w-2xl mx-auto">
          Vote for the themes that seem most important to discuss.
          You can cast multiple votes on the same theme.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(session.themes || []).map(theme => (
          <div key={theme.id} className={`bg-surface rounded-[2rem] border-2 p-8 space-y-6 flex flex-col transition-all hover:shadow-xl ${theme.voterIds.includes(currentUser.id) ? 'border-primary ring-4 ring-primary/20' : 'border-border'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-black text-2xl text-text">{theme.name}</h3>
                <p className="text-sm text-text-muted font-medium leading-relaxed">{theme.description}</p>
              </div>
              <div className="text-center shrink-0">
                <div className="bg-secondary text-primary px-4 py-2 rounded-xl border border-primary/20">
                  <span className="block text-3xl font-black leading-none">
                    {theme.voterIds.filter(id => id === currentUser.id).length}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Your Votes</span>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-background/50 rounded-2xl p-4 space-y-3 max-h-[300px] overflow-y-auto no-scrollbar border border-border/50">
              {(session.tickets || []).filter(t => t.themeId === theme.id).map(t => (
                <div key={t.id} className={`bg-surface p-4 rounded-xl border-2 text-sm md:text-base text-text shadow-sm leading-relaxed ${getColumnColorClass(t.column)}`}>
                  <p className="break-words min-w-0">{t.text}</p>
                  {(t.reactions && Object.keys(t.reactions).length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(t.reactions).map(([emoji, userIds]) => (
                        <ReactionBadge
                          key={emoji}
                          emoji={emoji}
                          userIds={userIds}
                          currentUserId={currentUser.id}
                          onToggle={(e) => onToggleReaction(t.id, e)}
                        />
                      ))}
                    </div>
                  )}
                  <div className="mt-2">
                    <ReactionPicker onSelect={(emoji) => onToggleReaction(t.id, emoji)} />
                  </div>
                </div>
              ))}
            </div>

            <button
              disabled={currentUser.votesRemaining <= 0}
              onClick={() => handleVote(theme.id)}
              className="w-full py-5 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black text-lg transition-all shadow-md active:scale-[0.97] disabled:opacity-20 flex items-center justify-center gap-3"
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
