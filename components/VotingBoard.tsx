
import React, { useState } from 'react';
import { Vote, Plus, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { SessionState, User } from '../types';
import { getColumnColorClass } from '../utils/colors';
import ReactionBadge from './ReactionBadge';
import ReactionPicker from './ReactionPicker';

interface Props {
  session: SessionState;
  currentUser: User;
  participants: User[];
  onUpdateSession: (s: SessionState) => void;
  onUpdateUser: (u: User) => void;
  onToggleReaction: (ticketId: string, emoji: string) => void;
}

const VotingBoard: React.FC<Props> = ({ session, currentUser, participants, onUpdateSession, onUpdateUser, onToggleReaction }) => {
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const currentUserId = String(currentUser.id);

  const getVotesForUser = (userId: string) => {
    return (session.themes || []).reduce((acc, theme) =>
      acc + (theme.voterIds?.filter(id => String(id) === String(userId)).length || 0), 0);
  };

  const handleVote = (themeId: string) => {
    if (currentUser.votesRemaining <= 0) return;

    onUpdateSession({
        ...session,
        themes: (session.themes || []).map(t => t.id === themeId ? {
          ...t,
          votes: t.votes + 1,
          voterIds: [...t.voterIds, currentUserId]
        } : t)
    });

    onUpdateUser({ ...currentUser, votesRemaining: currentUser.votesRemaining - 1 });
  };

  const handleRemoveVote = (themeId: string) => {
    const theme = (session.themes || []).find(t => t.id === themeId);
    if (!theme) return;

    const userVoteIndex = (theme.voterIds || []).findLastIndex(id => String(id) === currentUserId);
    if (userVoteIndex === -1) return;

    const newVoterIds = [...theme.voterIds];
    newVoterIds.splice(userVoteIndex, 1);

    onUpdateSession({
      ...session,
      themes: (session.themes || []).map(t => t.id === themeId ? {
        ...t,
        votes: Math.max(0, t.votes - 1),
        voterIds: newVoterIds
      } : t)
    });

    onUpdateUser({ ...currentUser, votesRemaining: currentUser.votesRemaining + 1 });
  };

  const toggleThemeExpand = (themeId: string) => {
    setExpandedThemes(prev => {
      const next = new Set(prev);
      if (next.has(themeId)) next.delete(themeId);
      else next.add(themeId);
      return next;
    });
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-6">
      {/* Compact header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center shrink-0">
            <Vote className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-text leading-tight">Theme Prioritization</h2>
            <p className="text-xs text-text-muted">
              Vote for the themes most important to discuss. Multiple votes per theme allowed.
            </p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl font-black text-sm shadow-sm shrink-0 ${
          currentUser.votesRemaining > 0
            ? 'bg-primary text-white animate-pulse'
            : 'bg-secondary text-text-muted'
        }`}>
          <Vote className="w-4 h-4" />
          <span>{currentUser.votesRemaining} votes left</span>
        </div>
      </div>

      {/* Admin: participant voting status */}
      {currentUser.isAdmin && (
        <div className="bg-surface/50 border border-border rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="text-xs font-black text-text flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Voting Status
            </h3>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[11px] font-black">
              {participants.filter(p => getVotesForUser(p.id) >= 5).length}/{participants.length} done
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {participants.map(p => {
              const votes = getVotesForUser(p.id);
              const isDone = votes >= 5;
              return (
                <div
                  key={p.id}
                  title={`${p.name}: ${votes}/5 votes`}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-all ${isDone
                    ? 'bg-primary/5 border-primary/30 text-primary font-bold'
                    : 'bg-surface border-border text-text-muted'
                  }`}
                >
                  <span className="truncate max-w-[70px]">{p.name}</span>
                  <span className={`font-black px-1 py-0.5 rounded text-[9px] ${isDone ? 'bg-primary/20' : 'bg-black/5'}`}>
                    {votes}
                  </span>
                  {isDone && <span className="text-[10px]">✅</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Theme cards grid — optimized for density */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {(session.themes || []).map(theme => {
          const userVotes = theme.voterIds.filter(id => String(id) === currentUserId).length;
          const hasVoted = userVotes > 0;
          const themeTickets = (session.tickets || []).filter(t => t.themeId === theme.id);
          const isExpanded = expandedThemes.has(theme.id);

          return (
            <div
              key={theme.id}
              className={`bg-surface rounded-xl border-2 p-3 flex flex-col transition-all hover:shadow-md ${
                hasVoted ? 'border-primary ring-2 ring-primary/15' : 'border-border'
              }`}
            >
              {/* Theme header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-[13px] text-text break-words leading-tight">{theme.name}</h3>
                </div>
                {userVotes > 0 && (
                  <div className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md shrink-0 text-center">
                    <span className="block text-sm font-black leading-none">{userVotes}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider">vote{userVotes > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {/* Collapsible ticket list */}
              <button
                onClick={() => toggleThemeExpand(theme.id)}
                className="flex items-center gap-1 text-[10px] font-bold text-text-muted hover:text-text transition-colors mb-2"
              >
                {isExpanded
                  ? <ChevronDown className="w-3 h-3" />
                  : <ChevronRight className="w-3 h-3" />
                }
                {themeTickets.length} card{themeTickets.length !== 1 ? 's' : ''}
              </button>

              {isExpanded && (
                <div className="flex-1 bg-background/50 rounded-lg p-2 space-y-1.5 max-h-[200px] overflow-y-auto border border-border/50 mb-2">
                  {themeTickets.map(t => (
                    <div key={t.id} className={`bg-surface p-2 rounded-lg border-l-[3px] text-[12px] text-text leading-snug ${getColumnColorClass(t.column)}`}>
                      <p className="break-words min-w-0">{t.text}</p>
                      {(t.reactions && Object.keys(t.reactions).length > 0) && (
                        <div className="mt-1 flex flex-wrap gap-0.5">
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
                      <div className="mt-1">
                        <ReactionPicker onSelect={(emoji) => onToggleReaction(t.id, emoji)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Vote buttons */}
              <div className="flex gap-2 mt-auto">
                {userVotes > 0 && (
                  <button
                    onClick={() => handleRemoveVote(theme.id)}
                    className="p-2 bg-secondary hover:bg-secondary-hover text-text rounded-lg transition-all shadow-sm active:scale-[0.97]"
                    title="Remove a vote"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}
                <button
                  disabled={currentUser.votesRemaining <= 0}
                  onClick={() => handleVote(theme.id)}
                  className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold text-[12px] transition-all shadow-sm active:scale-[0.97] disabled:opacity-20 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Vote
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VotingBoard;
