
import React, { useState, useCallback } from 'react';
import { Sparkles, Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight, GripVertical, RefreshCw } from 'lucide-react';
import { SessionState, ThemeGroup, Ticket, User } from '../types';
import { getColumnColorClass } from '../utils/colors';

interface Props {
  session: SessionState;
  currentUser: User;
  onUpdateSession: (s: SessionState) => void;
  onToggleReaction: (ticketId: string, emoji: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

const GroupingBoard: React.FC<Props> = ({ session, currentUser, onUpdateSession, onToggleReaction, onRegenerate, isRegenerating }) => {
  const [isAddingTheme, setIsAddingTheme] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editThemeName, setEditThemeName] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const moveTicket = useCallback((ticketId: string, themeId: string | undefined) => {
    onUpdateSession({
      ...session,
      tickets: (session.tickets || []).map(t => t.id === ticketId ? { ...t, themeId } : t)
    });
  }, [session, onUpdateSession]);

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

  const toggleCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const collapseAll = () => {
    const allIds = new Set<string>();
    allIds.add('__unassigned__');
    (session.themes || []).forEach(t => allIds.add(t.id));
    setCollapsedGroups(allIds);
  };

  const expandAll = () => {
    setCollapsedGroups(new Set());
  };

  const handleDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroupId(groupId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverGroupId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, themeId: string | undefined) => {
    e.preventDefault();
    const tid = e.dataTransfer.getData("tid");
    if (tid) moveTicket(tid, themeId);
    setDragOverGroupId(null);
  }, [moveTicket]);

  const handleDragStart = useCallback((e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData("tid", ticketId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const unassignedTickets = (session.tickets || []).filter(t => !t.themeId);

  const CompactTicket = ({ ticket }: { ticket: Ticket }) => {
    const [expanded, setExpanded] = useState(false);
    const isLong = ticket.text.length > 25;

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, ticket.id)}
        onClick={() => isLong && setExpanded(prev => !prev)}
        title={ticket.text}
        className={`flex items-start gap-1.5 py-1 px-2 rounded-md border-l-[3px] bg-ticket-bg hover:bg-surface cursor-grab active:cursor-grabbing transition-all text-[12px] leading-snug group/ticket ${isLong ? 'cursor-pointer' : ''} ${getColumnColorClass(ticket.column)}`}
      >
        <GripVertical className="w-2.5 h-2.5 text-text-muted/40 shrink-0 mt-0.5 group-hover/ticket:text-text-muted transition-colors" />
        <span className={`text-text flex-1 min-w-0 ${expanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
          {ticket.text}
        </span>
      </div>
    );
  };

  const GroupColumn = ({
    groupId,
    title,
    tickets,
    themeId,
    isUnassigned = false,
    theme
  }: {
    groupId: string;
    title: string;
    tickets: Ticket[];
    themeId: string | undefined;
    isUnassigned?: boolean;
    theme?: ThemeGroup;
  }) => {
    const isCollapsed = collapsedGroups.has(groupId);
    const isDragOver = dragOverGroupId === groupId;

    return (
      <div
        className={`flex flex-col rounded-xl border-2 transition-all duration-200 shrink-0 ${isUnassigned
          ? 'bg-secondary/20 border-dashed border-border min-w-[160px] w-[160px]'
          : 'bg-surface border-border min-w-[170px] w-[170px]'
          } ${isDragOver ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : ''} ${isCollapsed ? 'h-fit' : 'h-[min(420px,calc(100vh-250px))]'
          }`}
        onDragOver={(e) => handleDragOver(e, groupId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, themeId)}
      >
        {/* Header — always visible, acts as drop target */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-2 border-b border-border cursor-pointer select-none shrink-0 ${isDragOver ? 'bg-primary/10' : ''
            }`}
          onClick={() => toggleCollapse(groupId)}
        >
          {isCollapsed
            ? <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
            : <ChevronDown className="w-3 h-3 text-text-muted shrink-0" />
          }
          <div className="flex-1 min-w-0">
            {editingThemeId === theme?.id ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={editThemeName}
                  onChange={(e) => setEditThemeName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveThemeName(); }}
                  className="w-full text-xs font-bold text-text bg-background rounded px-1.5 py-0.5 outline-none"
                />
                <button onClick={saveThemeName} className="text-green-500 hover:text-green-600 shrink-0">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative group/tooltip flex-1 min-w-0">
                <h3 className="font-bold text-[11px] text-text truncate">
                  {title}
                </h3>
                {/* Custom Tooltip */}
                <div className="absolute left-0 top-full mt-1 w-max max-w-[250px] bg-gray-900 text-white text-[10px] p-2 rounded shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none break-words leading-tight border border-white/10">
                  {title}
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45 border-t border-l border-white/10"></div>
                </div>
              </div>
            )}
          </div>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${tickets.length > 0
            ? 'bg-primary/15 text-primary'
            : 'bg-secondary text-text-muted'
            }`}>
            {tickets.length}
          </span>
          {theme && !isCollapsed && (
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => startEditing(theme)}
                className="p-1 text-text-muted hover:text-text hover:bg-secondary rounded transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteTheme(theme.id)}
                className="p-1 text-text-muted hover:text-red-500 hover:bg-red-50 rounded transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Ticket list — scrollable */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
            {tickets.map(t => (
              <CompactTicket key={t.id} ticket={t} />
            ))}
            {tickets.length === 0 && (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border/50 rounded-xl p-4 min-h-[80px]">
                <span className="text-text-muted/40 font-bold uppercase tracking-widest text-[10px]">
                  Drop here
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-text leading-tight">Theme Grouping</h2>
            <p className="text-xs text-text-muted">
              {(session.tickets || []).length} tickets · {(session.themes || []).length} groups
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={expandAll}
            className="text-xs font-bold text-text-muted hover:text-text px-3 py-1.5 rounded-lg hover:bg-secondary transition-all"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="text-xs font-bold text-text-muted hover:text-text px-3 py-1.5 rounded-lg hover:bg-secondary transition-all"
          >
            Collapse all
          </button>
          {currentUser.isAdmin && onRegenerate && (
            <>
              <div className="w-px h-5 bg-border mx-1" />
              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-primary px-3 py-1.5 rounded-lg hover:bg-secondary transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Regenerating...' : 'Regenerate AI'}
              </button>
            </>
          )}
          <div className="w-px h-5 bg-border mx-1" />
          {!isAddingTheme ? (
            <button
              onClick={() => setIsAddingTheme(true)}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Group
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTheme()}
                placeholder="Group name..."
                className="px-3 py-1.5 border-2 border-border rounded-lg focus:border-primary outline-none transition-all text-sm text-text bg-background w-36"
              />
              <button onClick={addTheme} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsAddingTheme(false)} className="p-1.5 bg-secondary text-text-muted rounded-lg hover:bg-border transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Wrapping columns */}
      <div className="flex flex-wrap gap-4 pb-4">
        {/* Unassigned */}
        {unassignedTickets.length > 0 && (
          <GroupColumn
            groupId="__unassigned__"
            title="Unassigned"
            tickets={unassignedTickets}
            themeId={undefined}
            isUnassigned
          />
        )}

        {/* Theme columns */}
        {(session.themes || []).map(theme => (
          <GroupColumn
            key={theme.id}
            groupId={theme.id}
            title={theme.name}
            tickets={(session.tickets || []).filter(t => t.themeId === theme.id)}
            themeId={theme.id}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
};

export default GroupingBoard;
