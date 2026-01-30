
import React, { useState, useEffect } from 'react';
import { RetroPhase, ColumnType, User, SessionState, ThemeGroup } from './types';
import { groupTicketsWithAI } from './services/geminiService';
import { LayoutDashboard } from 'lucide-react';

import BoardHeader from './components/BoardHeader';
import PhaseStepper from './components/PhaseStepper';
import BrainstormBoard from './components/BrainstormBoard';
import GroupingBoard from './components/GroupingBoard';
import VotingBoard from './components/VotingBoard';
import DiscussionBoard from './components/DiscussionBoard';

const STORAGE_KEY = 'retro_session_v1';
const USER_KEY = 'retro_user_v1';

const App: React.FC = () => {
  const [session, setSession] = useState<SessionState | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    const storedSession = localStorage.getItem(STORAGE_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedUser) setCurrentUser(JSON.parse(storedUser));

    if (sessionId) {
      setIsJoining(true);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed.id === sessionId) setSession(parsed);
        else initializePlaceholderSession(sessionId);
      } else {
        initializePlaceholderSession(sessionId);
      }
    } else if (storedSession) {
      setSession(JSON.parse(storedSession));
    }
  }, []);

  const initializePlaceholderSession = (id: string) => {
    setSession({
      id,
      phase: RetroPhase.BRAINSTORM,
      tickets: [],
      themes: [],
      currentThemeIndex: 0,
      adminId: 'pending'
    });
  };

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    if (currentUser) localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  }, [session, currentUser]);

  const createSession = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const user: User = { id: 'admin-' + Date.now(), name: 'Admin', isAdmin: true, votesRemaining: 5 };
    setSession({
      id: newId,
      phase: RetroPhase.BRAINSTORM,
      tickets: [],
      themes: [],
      currentThemeIndex: 0,
      adminId: user.id
    });
    setCurrentUser(user);
    window.history.pushState({}, '', `?session=${newId}`);
  };

  const sortThemesByVotes = (themes: ThemeGroup[]) => {
    return [...themes].sort((a, b) => b.votes - a.votes);
  };

  const handleNextPhase = async () => {
    if (!session || !currentUser?.isAdmin) return;
    setError(null);
    const phases = Object.values(RetroPhase);
    const currentIndex = phases.indexOf(session.phase);

    if (session.phase === RetroPhase.BRAINSTORM) {
      if (session.tickets.length === 0) return setError("Add some cards before grouping!");
      setIsLoading(true);
      try {
        const { themes, ticketAssignments } = await groupTicketsWithAI(session.tickets);
        setSession({
          ...session,
          phase: RetroPhase.GROUPING,
          themes: themes.length > 0 ? themes : [{ id: 'misc', name: 'General', description: 'Miscellaneous topics', votes: 0, voterIds: [] }],
          tickets: session.tickets.map(t => ({ ...t, themeId: ticketAssignments[t.id] || themes[0]?.id || 'misc' }))
        });
      } catch (e) { setError("Error during AI grouping."); }
      finally { setIsLoading(false); }
    } else if (session.phase === RetroPhase.VOTING) {
      const sortedThemes = sortThemesByVotes(session.themes);
      setSession({
        ...session,
        phase: RetroPhase.DISCUSSION,
        themes: sortedThemes,
        currentThemeIndex: 0
      });
    } else if (currentIndex < phases.length - 1) {
      setSession({ ...session, phase: phases[currentIndex + 1] });
    }
  };

  const handlePhaseManualChange = (targetPhase: RetroPhase) => {
    if (!session || !currentUser?.isAdmin) return;

    let updatedSession = { ...session, phase: targetPhase };

    if (targetPhase === RetroPhase.DISCUSSION) {
      updatedSession.themes = sortThemesByVotes(session.themes);
      updatedSession.currentThemeIndex = 0;
    }

    setSession(updatedSession);
  };

  if (!session && !isJoining) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 text-center space-y-8">
        <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-100">
          <LayoutDashboard className="text-white w-10 h-10" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight">Retro</h1>
          <p className="text-lg text-slate-600 leading-relaxed">Organize seamless and intelligent team retrospectives.</p>
        </div>
        <button onClick={createSession} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl transition-all shadow-md active:scale-[0.98] text-lg">
          Start a session
        </button>
      </div>
    </div>
  );

  if (isJoining && !currentUser) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900">
      <form onSubmit={(e) => { e.preventDefault(); const n = new FormData(e.currentTarget).get('userName'); if (n) { setCurrentUser({ id: 'user-' + Date.now(), name: String(n), isAdmin: false, votesRemaining: 5 }); setIsJoining(false); } }} className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Welcome!</h2>
          <p className="text-slate-600">Enter your name to join the session.</p>
        </div>
        <div className="space-y-4">
          <input name="userName" required autoFocus className="w-full px-5 py-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-lg text-slate-900 bg-white" placeholder="Your name..." />
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl transition-all text-lg shadow-sm">
            Join the Retro
          </button>
        </div>
      </form>
    </div>
  );

  if (!session || !currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <BoardHeader session={session} currentUser={currentUser} isLoading={isLoading} error={error} onNextPhase={handleNextPhase} onReset={() => { localStorage.clear(); window.location.href = '/'; }} />
      <PhaseStepper currentPhase={session.phase} isAdmin={currentUser.isAdmin} onPhaseChange={handlePhaseManualChange} />
      <main className="flex-1 p-6 lg:p-10 overflow-auto">
        {session.phase === RetroPhase.BRAINSTORM && <BrainstormBoard session={session} currentUser={currentUser} onUpdateSession={setSession} />}
        {session.phase === RetroPhase.GROUPING && <GroupingBoard session={session} onUpdateSession={setSession} />}
        {session.phase === RetroPhase.VOTING && <VotingBoard session={session} currentUser={currentUser} onUpdateSession={setSession} onUpdateUser={setCurrentUser} />}
        {session.phase === RetroPhase.DISCUSSION && <DiscussionBoard session={session} currentUser={currentUser} onUpdateSession={setSession} />}
      </main>
    </div>
  );
};

export default App;
