
import React from 'react';
import { Sparkles } from 'lucide-react';
import { SessionState } from '../types';

interface Props {
  session: SessionState;
  onUpdateSession: (s: SessionState) => void;
}

const GroupingBoard: React.FC<Props> = ({ session, onUpdateSession }) => {
  const moveTicket = (ticketId: string, themeId: string) => {
    onUpdateSession({
      ...session,
      tickets: session.tickets.map(t => t.id === ticketId ? { ...t, themeId } : t)
    });
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center"><Sparkles className="w-7 h-7 text-indigo-600" /></div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 leading-tight">Theme Grouping</h2>
          <p className="text-base text-slate-600">The AI has organized your feedback by topic. You can drag and drop cards to move them between themes.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {session.themes.map(theme => (
          <div key={theme.id} className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm p-8 space-y-6 min-h-[300px] flex flex-col hover:border-indigo-100 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { const tid = e.dataTransfer.getData("tid"); if (tid) moveTicket(tid, theme.id); }}>
            <div className="pb-4 border-b border-slate-100 space-y-2">
              <h3 className="font-black text-2xl text-slate-900">{theme.name}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">{theme.description}</p>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {session.tickets.filter(t => t.themeId === theme.id).map(t => (
                <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("tid", t.id)}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm md:text-base text-slate-800 cursor-grab active:cursor-grabbing hover:bg-white hover:border-indigo-300 transition-all shadow-sm">
                  {t.text}
                </div>
              ))}
              {session.tickets.filter(t => t.themeId === theme.id).length === 0 && (
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
