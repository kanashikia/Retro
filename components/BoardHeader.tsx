
import React from 'react';
import { LayoutDashboard, Users, Sparkles, ChevronRight, Copy, LogOut, AlertCircle, Palette } from 'lucide-react';
import { SessionState, User, RetroPhase } from '../types';
import Timer from './Timer';
import { useTheme } from '../context/ThemeContext';
import { themes } from '../themes';

interface Props {
  session: SessionState;
  currentUser: User;
  participants: User[];
  isLoading: boolean;
  error: string | null;
  onNextPhase: () => void;
  onReset: () => void;
  onUpdateSession: (updates: Partial<SessionState>) => void;
}

const getUserColor = (name: string) => {
  const colors = [
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'bg-orange-100 text-orange-700 border-orange-200',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const BoardHeader: React.FC<Props> = ({ session, currentUser, participants, isLoading, error, onNextPhase, onReset, onUpdateSession }) => {
  const { currentTheme, setTheme } = useTheme();

  const [isThemeOpen, setIsThemeOpen] = React.useState(false);
  const themeDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setIsThemeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-surface/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-inner transition-colors duration-300"><LayoutDashboard className="text-white w-5 h-5" /></div>
          <span className="font-black text-2xl text-text tracking-tight hidden sm:inline transition-colors duration-300">Retro</span>
        </div>
        <div className="h-8 w-px bg-border hidden xs:block transition-colors duration-300"></div>

        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full text-sm font-bold text-primary border border-border shadow-sm transition-colors duration-300">
            <Users className="w-4 h-4" />
            <span className="text-text">{currentUser.name}</span>
            {currentUser.isAdmin && <span className="bg-primary text-white text-[10px] uppercase px-1.5 py-0.5 rounded ml-1 font-black">Admin</span>}
          </div>

          {session.brainstormTimerEndsAt && (
            <Timer endsAt={session.brainstormTimerEndsAt} />
          )}

          <div className="flex items-center">
            <div className="flex -space-x-3 items-center">
              {participants.filter(p => p.id !== currentUser.id).slice(0, 5).map(p => (
                <div
                  key={p.id}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-sm transition-transform hover:scale-110 hover:z-10 relative 
                  ${p.isReady ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-surface'} 
                  ${getUserColor(p.name)}`}
                  title={`${p.name}${p.isReady ? ' (Ready)' : ''}`}
                >
                  {p.name.charAt(0).toUpperCase()}
                  {p.isReady && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-surface flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </div>
              ))}
              {participants.length > 6 && (
                <div className="w-10 h-10 rounded-full border-2 border-surface bg-secondary flex items-center justify-center text-xs font-bold text-text-muted z-0 shadow-sm">
                  +{participants.length - 6}
                </div>
              )}
            </div>
            <span className="ml-4 text-xs text-text-muted font-semibold uppercase tracking-wider hidden sm:inline transition-colors duration-300">
              {participants.length === 1 ? 'Only you' : `${participants.length} online`}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative" ref={themeDropdownRef}>
          <button
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            className={`p-2.5 rounded-xl transition-colors border ${isThemeOpen ? 'bg-secondary text-text border-border' : 'text-text-muted hover:bg-secondary hover:text-text border-transparent hover:border-border'}`}
            title="Change Theme"
          >
            <Palette className="w-6 h-6" />
          </button>

          {isThemeOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-2 border-b border-border bg-secondary/30">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Select Theme</span>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {themes.map(theme => (
                  <div key={theme.id} className="flex items-center justify-between hover:bg-secondary transition-colors group/item px-4 py-2">
                    <button
                      onClick={() => {
                        setTheme(theme.id);
                        // Optional: keep open or close? User might want to try multiple. 
                        // Keeping it open is usually better for "Trying things out"
                      }}
                      className={`flex-1 text-left text-sm font-medium flex items-center gap-2 ${currentTheme.id === theme.id ? 'text-primary' : 'text-text'}`}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.primary }}></div>
                      {theme.name}
                    </button>
                    {currentUser.isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Set "${theme.name}" as the default for everyone?`)) {
                            onUpdateSession({ defaultThemeId: theme.id });
                          }
                        }}
                        className="opacity-0 group-hover/item:opacity-100 p-1 text-xs text-text-muted hover:text-primary transition-all"
                        title="Set as session default"
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {/* Show reset option if user has overridden the default */}
              {useTheme().isOverridden && (
                <div className="border-t border-border p-2">
                  <button
                    onClick={useTheme().resetToDefault}
                    className="w-full text-left px-2 py-1 text-xs text-text-muted hover:text-text transition-colors flex items-center gap-2"
                  >
                    <span className="w-3 h-3 flex items-center justify-center">↺</span>
                    Reset to Session Default
                  </button>
                </div>
              )}
              <div className="border-t border-border p-2 bg-secondary/10">
                <div className="text-[10px] text-text-muted text-center">
                  Session Default: {themes.find(t => t.id === useTheme().sessionDefaultThemeId)?.name || 'Default Light'}
                </div>
              </div>
            </div>
          )}
        </div>
        {error && <div className="text-red-600 text-sm font-bold px-4 py-2 bg-red-50 rounded-lg flex items-center gap-2 animate-pulse"><AlertCircle className="w-4 h-4" /> {error}</div>}
        {currentUser.isAdmin && (
          <button onClick={onNextPhase} disabled={isLoading} className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl text-base font-bold transition-all shadow-md active:scale-95 disabled:opacity-50">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (session.phase === RetroPhase.BRAINSTORM ? <Sparkles className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />)}
            {session.phase === RetroPhase.BRAINSTORM ? "Group with AI" : "Next"}
          </button>
        )}
        <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }} className="p-2.5 hover:bg-secondary rounded-xl text-text-muted hover:text-text transition-colors border border-transparent hover:border-border" title="Copy share link"><Copy className="w-6 h-6" /></button>
        <button onClick={() => {
          if (currentUser.isAdmin) {
            if (window.confirm("Do you want to close this session for everyone? This will save it to your history.")) {
              onReset();
            }
          } else {
            onReset();
          }
        }} className="p-2.5 hover:bg-red-50 rounded-xl text-red-600 transition-colors border border-transparent hover:border-red-100" title="Leave session"><LogOut className="w-6 h-6" /></button>
      </div>
    </header>
  );
};

export default BoardHeader;
