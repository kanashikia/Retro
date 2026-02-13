
import React, { useState } from 'react';
import { Plus, Send, Trash2 } from 'lucide-react';
import { SessionState, User, ColumnType, Ticket } from '../types';
import { getColumnColorClass } from '../utils/colors';

interface Props {
  session: SessionState;
  currentUser: User;
  onUpdateSession: (s: SessionState) => void;
}

const BrainstormBoard: React.FC<Props> = ({ session, currentUser, onUpdateSession }) => {
  const [activeCol, setActiveCol] = useState<ColumnType | null>(null);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [text, setText] = useState("");

  const canViewTicket = (ticket: Ticket) => {
    if (currentUser.isAdmin) return true;
    if (!ticket.authorId) return false;
    return ticket.authorId === currentUser.id;
  };

  const addTicket = (col: ColumnType) => {
    if (!text.trim()) return;
    const newTicket: Ticket = {
      id: Math.random().toString(36).substr(2, 9),
      text: text.trim(),
      column: col,
      author: currentUser.name,
      authorId: currentUser.id,
      votes: 0,
      voterIds: []
    };
    onUpdateSession({ ...session, tickets: [...session.tickets, newTicket] });
    setText("");
    setActiveCol(null);
  };

  const updateTicket = (ticketId: string) => {
    if (!text.trim()) return;
    const updatedTickets = session.tickets.map(t =>
      t.id === ticketId ? { ...t, text: text.trim() } : t
    );
    onUpdateSession({ ...session, tickets: updatedTickets });
    setText("");
    setEditingTicketId(null);
  };

  const deleteTicket = (ticketId: string) => {
    onUpdateSession({ ...session, tickets: session.tickets.filter(t => t.id !== ticketId) });
  };

  const startEditing = (ticket: Ticket) => {
    setEditingTicketId(ticket.id);
    setText(ticket.text);
  };

  return (
    <div className="flex flex-col gap-8 h-full">
      {currentUser.isAdmin && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-700">Brainstorm Timer:</span>
            <select
              value={session.brainstormTimerDuration || 10}
              onChange={(e) => onUpdateSession({ ...session, brainstormTimerDuration: Number(e.target.value) })}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500"
            >
              {[1, 2, 5, 10, 15, 20, 30].map(m => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            {!session.brainstormTimerEndsAt ? (
              <button
                onClick={() => {
                  const duration = session.brainstormTimerDuration || 10;
                  const endsAt = Date.now() + duration * 60 * 1000;
                  onUpdateSession({ ...session, brainstormTimerEndsAt: endsAt });
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95"
              >
                Start Timer
              </button>
            ) : (
              <button
                onClick={() => onUpdateSession({ ...session, brainstormTimerEndsAt: null })}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95"
              >
                Reset Timer
              </button>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {Object.values(ColumnType).map((col) => (
          <div key={col} className="flex flex-col gap-6">
            <div className={`flex items-center justify-between p-4 rounded-xl border-b-4 bg-white shadow-sm
            ${col === ColumnType.WELL ? 'border-emerald-500' :
                col === ColumnType.LESS_WELL ? 'border-rose-500' :
                  col === ColumnType.PUZZLES ? 'border-sky-500' : 'border-amber-500'}`}>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{col}</h3>
              <button onClick={() => { setActiveCol(col); setText(""); setEditingTicketId(null); }} className="p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                <Plus className="w-5 h-5 text-slate-700" />
              </button>
            </div>
            <div className="flex flex-col gap-4 min-h-[150px]">
              {activeCol === col && !editingTicketId && (
                <div className="bg-white p-5 rounded-2xl border-2 border-indigo-400 shadow-xl ring-4 ring-indigo-50 animate-in zoom-in-95">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                    className="w-full min-h-[120px] text-lg outline-none resize-none placeholder:text-slate-400 bg-white text-slate-900"
                    placeholder="Describe your idea here..."
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTicket(col); } }}
                  />
                  <div className="flex justify-end gap-3 mt-3">
                    <button onClick={() => setActiveCol(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
                    <button onClick={() => addTicket(col)} className="px-5 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-sm">Send <Send className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
              {(session.tickets || [])
                .filter(t => t.column === col && canViewTicket(t))
                .map(ticket => (
                  <div key={ticket.id} className={`p-6 rounded-2xl border-2 bg-white group relative shadow-sm hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-2 ${getColumnColorClass(ticket.column)}`}>
                    {editingTicketId === ticket.id ? (
                      <div className="flex flex-col gap-3">
                        <textarea
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          autoFocus
                          className="w-full min-h-[100px] text-base outline-none resize-none bg-slate-50 p-3 rounded-xl border border-indigo-200"
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); updateTicket(ticket.id); } }}
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingTicketId(null)} className="px-3 py-1 text-xs font-bold text-slate-500">Cancel</button>
                          <button onClick={() => updateTicket(ticket.id)} className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg">Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-800 text-base lg:text-lg leading-relaxed whitespace-pre-wrap">{ticket.text}</p>
                        <div className="mt-5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">{ticket.author[0]}</div>
                            <span className="text-xs font-bold text-slate-600">By {ticket.author}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {(currentUser.isAdmin || String(ticket.authorId) === String(currentUser.id)) && (
                              <>
                                <button onClick={() => startEditing(ticket)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={() => deleteTicket(ticket.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrainstormBoard;
