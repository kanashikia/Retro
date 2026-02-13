
import React from 'react';
import { Sparkles, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { SessionState, ThemeGroup, User } from '../types';
import { getColumnColorClass } from '../utils/colors';
import ReactionBadge from './ReactionBadge';
import ReactionPicker from './ReactionPicker';

interface Props {
  session: SessionState;
  currentUser: User;
  onUpdateSession: (s: SessionState) => void;
  onToggleReaction: (ticketId: string, emoji: string) => void;
}

const GroupingBoard: React.FC<Props> = ({ session, currentUser, onUpdateSession, onToggleReaction }) => {
  const [isAddingTheme, setIsAddingTheme] = React.useState(false);
  const [newThemeName, setNewThemeName] = React.useState("");
  const [editingThemeId, setEditingThemeId] = React.useState<string | null>(null);
  const [editThemeName, setEditThemeName] = React.useState("");

  const moveTicket = (ticketId: string, themeId: string | undefined) => {
    onUpdateSession({
      ...session,
      tickets: (session.tickets || []).map(t => t.id === ticketId ? { ...t, themeId } : t)
    });
  };

  const addTheme = () => {
    if (!newThemeName.trim()) return;
    const newTheme: ThemeGroup = {
      id: crypto.randomUUID(),
      name: newThemeName.trim(),
      description: "Manually created group",
      votes: 0,
      voterIds: []
    };
    onUpdateSession({
      ...session,
      themes: [...(session.themes || []), newTheme]
    });
    setNewThemeName("");
    setIsAddingTheme(false);
  };

  const deleteTheme = (themeId: string) => {
    onUpdateSession({
      ...session,
      themes: (session.themes || []).filter(t => t.id !== themeId),
      tickets: (session.tickets || []).map(t => t.themeId === themeId ? { ...t, themeId: undefined } : t)
    });
  };

  const startEditing = (theme: ThemeGroup) => {
    setEditingThemeId(theme.id);
    setEditThemeName(theme.name);
  };

  const saveThemeName = () => {
    if (!editingThemeId || !editThemeName.trim()) return;
    onUpdateSession({
      ...session,
      themes: (session.themes || []).map(t => t.id === editingThemeId ? { ...t, name: editThemeName.trim() } : t)
    });
    setEditingThemeId(null);
  };

  const unassignedTickets = (session.tickets || []).filter(t => !t.themeId);

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center"><Sparkles className="w-7 h-7 text-indigo-600" /></div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">Theme Grouping</h2>
            <p className="text-base text-slate-600">The AI has organized your feedback. You can also manually add groups and move cards.</p>
          </div>
        </div>

        {!isAddingTheme ? (
          <button
            onClick={() => setIsAddingTheme(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Group
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTheme()}
              placeholder="Group name..."
              className="px-4 py-2 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all"
            />
            <button onClick={addTheme} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"><Check className="w-5 h-5" /></button>
            <button onClick={() => setIsAddingTheme(false)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"><X className="w-5 h-5" /></button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {unassignedTickets.length > 0 && (
          <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8 space-y-6 min-h-[300px] flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { const tid = e.dataTransfer.getData("tid"); if (tid) moveTicket(tid, undefined); }}>
            <div className="pb-4 border-b border-slate-200">
              <h3 className="font-black text-2xl text-slate-400 capitalize">Unassigned Tickets</h3>
              <p className="text-sm text-slate-400 font-medium">Drag cards here to ungroup them</p>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {unassignedTickets.map(t => (
                <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("tid", t.id)}
                  className={`bg-white p-4 rounded-xl border-2 text-sm md:text-base text-slate-800 cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-all shadow-sm ${getColumnColorClass(t.column)}`}>
                  <p>{t.text}</p>
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
          </div>
        )}

        {(session.themes || []).map(theme => (
          <div key={theme.id} className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm p-8 space-y-6 min-h-[300px] flex flex-col hover:border-indigo-100 transition-colors relative group"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { const tid = e.dataTransfer.getData("tid"); if (tid) moveTicket(tid, theme.id); }}>

            <div className="pb-4 border-b border-slate-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                {editingThemeId === theme.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      autoFocus
                      value={editThemeName}
                      onChange={(e) => setEditThemeName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveThemeName()}
                      className="w-full text-xl font-black text-slate-900 bg-slate-50 rounded px-2 py-1 outline-none"
                    />
                    <button onClick={saveThemeName} className="text-green-500 hover:text-green-600"><Check className="w-5 h-5" /></button>
                  </div>
                ) : (
                  <h3 className="font-black text-2xl text-slate-900 flex-1 truncate">{theme.name}</h3>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditing(theme)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteTheme(theme.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed truncate">{theme.description}</p>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              {(session.tickets || []).filter(t => t.themeId === theme.id).map(t => (
                <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("tid", t.id)}
                  className={`bg-slate-50 p-4 rounded-xl border-2 text-sm md:text-base text-slate-800 cursor-grab active:cursor-grabbing hover:bg-white hover:border-indigo-300 transition-all shadow-sm ${getColumnColorClass(t.column)}`}>
                  <p>{t.text}</p>
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
              {(session.tickets || []).filter(t => t.themeId === theme.id).length === 0 && (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl p-6">
                  <span className="text-slate-300 font-bold uppercase tracking-widest text-xs">Drop a card here</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupingBoard;
