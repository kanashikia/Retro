
import React from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard, Vote } from 'lucide-react';
import { SessionState, User } from '../types';
import { getColumnColorClass, getColumnSecondaryColorClass } from '../utils/colors';
import ReactionBadge from './ReactionBadge';
import ReactionPicker from './ReactionPicker';

interface Props {
  session: SessionState;
  currentUser: User;
  onUpdateSession: (s: SessionState) => void;
  onToggleReaction: (ticketId: string, emoji: string) => void;
}

const DiscussionBoard: React.FC<Props> = ({ session, currentUser, onUpdateSession, onToggleReaction }) => {
  const currentTheme = (session.themes || [])[session.currentThemeIndex];

  if (!currentTheme) return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-20">
      <div className="w-24 h-24 bg-secondary rounded-3xl flex items-center justify-center"><LayoutDashboard className="w-12 h-12 text-text-muted" /></div>
      <h3 className="text-3xl font-black text-text">No themes identified.</h3>
      <p className="text-text-muted max-w-md">The AI couldn't create any themes. Make sure you grouped the cards correctly.</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col gap-10 py-6">
      <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-6">
        <div className="flex items-center justify-center gap-4">
          <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary text-sm font-black rounded-xl uppercase tracking-widest border border-primary/20">
            Topic {session.currentThemeIndex + 1} of {(session.themes || []).length}
          </div>
          <div className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-700 text-sm font-black rounded-xl uppercase tracking-widest border border-emerald-200 gap-2">
            <Vote className="w-4 h-4" /> {currentTheme.votes} Votes
          </div>
        </div>
        <h2 className="text-6xl font-black text-text tracking-tight leading-none">{currentTheme.name}</h2>
        <p className="text-2xl text-text-muted max-w-3xl mx-auto leading-relaxed">{currentTheme.description}</p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-4 no-scrollbar pb-10">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] text-center mb-4">Cards linked to this theme</h3>
        {(session.tickets || [])
          .filter(t => t.themeId === currentTheme.id)
          .map(t => (
            <div key={t.id} className={`bg-surface p-8 rounded-[2.5rem] border-2 shadow-sm flex items-start gap-8 hover:border-primary/30 transition-all group ${getColumnColorClass(t.column)}`}>
              <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center shrink-0 border border-border group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                <span className="text-lg font-black text-border group-hover:text-primary leading-none">#</span>
              </div>
              <div className="flex-1 space-y-3 pt-1">
                <p className="text-text text-xl md:text-2xl font-semibold leading-relaxed">{t.text}</p>

                {(t.reactions && Object.keys(t.reactions).length > 0) && (
                  <div className="mt-4 flex flex-wrap gap-2">
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

                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-widest border ${getColumnSecondaryColorClass(t.column)}`}>
                      {t.column}
                    </span>
                    <span className="text-sm text-text-muted font-bold uppercase tracking-tighter">
                      • Shared by <span className="text-text">{t.author}</span>
                    </span>
                  </div>
                  <ReactionPicker onSelect={(emoji) => onToggleReaction(t.id, emoji)} />
                </div>
              </div>
            </div>
          ))}
      </div>

      {currentUser.isAdmin && (
        <div className="flex items-center justify-center gap-8 py-6 sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border">
          <button
            disabled={session.currentThemeIndex === 0}
            onClick={() => onUpdateSession({ ...session, currentThemeIndex: session.currentThemeIndex - 1 })}
            className="flex items-center gap-3 px-10 py-5 bg-surface border-2 border-border rounded-2xl font-black text-text hover:bg-secondary transition-all disabled:opacity-30 shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-7 h-7" /> Previous
          </button>
          <button
            disabled={session.currentThemeIndex === (session.themes || []).length - 1}
            onClick={() => onUpdateSession({ ...session, currentThemeIndex: session.currentThemeIndex + 1 })}
            className="flex items-center gap-3 px-10 py-5 bg-primary text-white rounded-2xl font-black hover:bg-primary-hover transition-all disabled:opacity-30 shadow-xl shadow-primary/20 active:scale-95"
          >
            Next Topic <ChevronRight className="w-7 h-7" />
          </button>
        </div>
      )}
    </div>
  );
};

export default DiscussionBoard;
