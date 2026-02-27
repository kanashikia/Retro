import React from 'react';
import { Action, SessionState, User } from '../types';
import { getColumnColorClass, getColumnSecondaryColorClass } from '../utils/colors';
import { Plus, Trash2, CheckCircle2, ChevronLeft, ChevronRight, LayoutDashboard, Vote, History } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ReactionBadge from './ReactionBadge';
import ReactionPicker from './ReactionPicker';

interface Props {
  session: SessionState;
  currentUser: User;
  participants: User[];
  onUpdateSession: (s: SessionState) => void;
  onToggleReaction: (ticketId: string, emoji: string) => void;
}

const DiscussionBoard: React.FC<Props> = ({ session, currentUser, participants, onUpdateSession, onToggleReaction }) => {
  const currentTheme = (session.themes || [])[session.currentThemeIndex];
  const [newActionText, setNewActionText] = React.useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = React.useState('');
  const isReadOnly = session.status === 'closed';


  const handleAddAction = () => {
    if (!newActionText.trim() || !selectedAssigneeId || isReadOnly) return;

    const assignee = participants.find(p => p.id === selectedAssigneeId);
    if (!assignee) return;

    const newAction: Action = {
      id: uuidv4(),
      text: newActionText.trim(),
      assigneeId: selectedAssigneeId,
      assigneeName: assignee.name
    };

    const updatedActions = [...(session.actions || []), newAction];
    onUpdateSession({ ...session, actions: updatedActions });
    setNewActionText('');
    setSelectedAssigneeId('');
  };

  const handleRemoveAction = (actionId: string) => {
    const updatedActions = (session.actions || []).filter(a => a.id !== actionId);
    onUpdateSession({ ...session, actions: updatedActions });
  };

  if (!currentTheme) return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-20">
      <div className="w-24 h-24 bg-secondary rounded-3xl flex items-center justify-center"><LayoutDashboard className="w-12 h-12 text-text-muted" /></div>
      <h3 className="text-3xl font-black text-text">No themes identified.</h3>
      <p className="text-text-muted max-w-md">The AI couldn't create any themes. Make sure you grouped the cards correctly.</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 py-6">
      <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-6">
        <div className="flex items-center justify-center gap-4">
          <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary text-sm font-black rounded-xl uppercase tracking-widest border border-primary/20">
            Topic {session.currentThemeIndex + 1} of {(session.themes || []).length}
          </div>
          <div className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-700 text-sm font-black rounded-xl uppercase tracking-widest border border-emerald-200 gap-2">
            <Vote className="w-4 h-4" /> {currentTheme.votes} Votes
          </div>
        </div>
        <h2 className="text-4xl font-black text-text tracking-tight leading-none">{currentTheme.name}</h2>
        <p className="text-lg text-text-muted max-w-3xl mx-auto leading-relaxed">{currentTheme.description}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] text-center mb-2">Cards linked to this theme</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {(session.tickets || [])
            .filter(t => t.themeId === currentTheme.id)
            .map(t => (
              <div key={t.id} className={`bg-surface p-4 rounded-2xl border-2 shadow-sm flex items-start gap-4 hover:border-primary/30 transition-all group ${getColumnColorClass(t.column)}`}>
                <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center shrink-0 border border-border group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                  <span className="text-sm font-black text-border group-hover:text-primary leading-none">#</span>
                </div>
                <div className="flex-1 min-w-0 space-y-3 pt-1">
                  <p className="text-text text-sm md:text-base font-semibold leading-relaxed break-words">{t.text}</p>

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
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.1em] border ${getColumnSecondaryColorClass(t.column)}`}>
                        {t.column}
                      </span>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-tight">
                        • Shared by <span className="text-text">{t.author}</span>
                      </span>
                    </div>
                    <ReactionPicker onSelect={(emoji) => onToggleReaction(t.id, emoji)} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {currentUser.isAdmin && (
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 py-4 border-y border-border bg-surface/50 rounded-2xl md:rounded-[2.5rem]">
          <button
            disabled={session.currentThemeIndex === 0}
            onClick={() => onUpdateSession({ ...session, currentThemeIndex: session.currentThemeIndex - 1 })}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-surface border-2 border-border rounded-xl md:rounded-2xl font-black text-text hover:bg-secondary transition-all disabled:opacity-30 shadow-sm active:scale-95 text-xs md:text-sm"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" /> Previous
          </button>
          <div className="text-[10px] md:text-xs font-black text-text-muted uppercase tracking-widest min-w-[80px] md:min-w-[100px] text-center">
            {session.currentThemeIndex + 1} / {(session.themes || []).length}
          </div>
          <button
            disabled={session.currentThemeIndex === (session.themes || []).length - 1}
            onClick={() => onUpdateSession({ ...session, currentThemeIndex: session.currentThemeIndex + 1 })}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-xl md:rounded-2xl font-black hover:bg-primary-hover transition-all disabled:opacity-30 shadow-xl shadow-primary/20 active:scale-95 text-xs md:text-sm"
          >
            Next Topic <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      )}

      {/* Action Items Section */}
      <div className="mt-4 pt-10 border-t border-border space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-text uppercase tracking-tight">Action Items</h3>
            <p className="text-text-muted font-medium italic text-sm">Designate responsible participants for key takeaways.</p>
          </div>
          <div className="px-4 py-2 bg-secondary text-text-muted text-xs font-black rounded-xl uppercase tracking-widest border border-border">
            {(session.actions || []).length} Total
          </div>
        </div>
      </div>


      <div className="grid lg:grid-cols-3 gap-8">
        {/* List of actions */}
        <div className="lg:col-span-2 space-y-4">
          {(session.actions || []).length > 0 ? (
            (session.actions || []).map((action) => (
              <div key={action.id} className="bg-surface p-4 rounded-2xl border border-border flex items-center justify-between hover:border-primary/30 transition-all group shadow-sm bg-gradient-to-r from-surface to-background/50">
                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-text text-base leading-tight">{action.text}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-text-muted uppercase tracking-[0.1em]">Assigned to:</span>
                      <span className="px-2 py-0.5 bg-secondary text-text text-[11px] font-black rounded-md uppercase tracking-wider">{action.assigneeName}</span>
                    </div>
                  </div>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => handleRemoveAction(action.id)}
                    className="p-3 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="p-10 bg-surface/50 rounded-[2.5rem] border-2 border-dashed border-border flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center"><Plus className="w-6 h-6 text-text-muted" /></div>
              <p className="text-text-muted font-black uppercase tracking-widest text-xs">{isReadOnly ? 'No actions were created' : 'No actions created yet'}</p>
            </div>
          )}
        </div>

        {/* Add Action Form */}
        {!isReadOnly ? (
          <div className="bg-surface p-8 rounded-[2.5rem] border-2 border-border shadow-xl space-y-6 h-fit sticky top-6">
            <h4 className="text-xl font-black text-text">New Action</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-text-muted uppercase tracking-widest">Description</label>
                <textarea
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full px-5 py-4 bg-background border-2 border-border rounded-2xl focus:border-primary outline-none transition-all text-sm font-medium h-32 resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-text-muted uppercase tracking-widest">Assign to</label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="w-full px-5 py-4 bg-background border-2 border-border rounded-2xl focus:border-primary outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
                >
                  <option value="">Select someone...</option>
                  {participants.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.id === currentUser.id ? '(You)' : ''}</option>
                  ))}
                </select>
              </div>
              <button
                disabled={!newActionText.trim() || !selectedAssigneeId}
                onClick={handleAddAction}
                className="w-full bg-primary text-white font-black py-4 rounded-2xl hover:bg-primary-hover transition-all disabled:opacity-30 disabled:grayscale active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                <Plus className="w-5 h-5" /> Add Action Item
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-surface/30 p-8 rounded-[2.5rem] border-2 border-border border-dashed space-y-6 h-fit sticky top-6 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <LayoutDashboard className="w-8 h-8 text-primary/40" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-black text-text italic tracking-tight">Session Closed</h4>
              <p className="text-text-muted text-sm font-medium leading-relaxed">This session is in read-only mode. Actions cannot be modified.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default DiscussionBoard;
