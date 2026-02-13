import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useNavigate } from 'react-router-dom';
import { RetroPhase, ColumnType, User, SessionState, ThemeGroup } from '../types';
import { groupTicketsWithAI } from '../services/geminiService';
import { io } from 'socket.io-client';

const socket = io(undefined, {
    path: '/socket.io',
    transports: ['polling', 'websocket']
});

import BoardHeader from './BoardHeader';
import PhaseStepper from './PhaseStepper';
import BrainstormBoard from './BrainstormBoard';
import GroupingBoard from './GroupingBoard';
import VotingBoard from './VotingBoard';
import DiscussionBoard from './DiscussionBoard';

const USER_KEY = 'retro_user_v1';
const ADMIN_KEY = 'retro_admin';

const RetroBoard: React.FC = () => {
    const { id: sessionId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<SessionState | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [participants, setParticipants] = useState<User[]>([]);
    const [isJoining, setIsJoining] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId) {
            navigate('/');
            return;
        }

        const storedAdmin = localStorage.getItem(ADMIN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedAdmin) {
            const adminData = JSON.parse(storedAdmin);
            setCurrentUser({ ...adminData, votesRemaining: 5 });
        } else if (storedUser) {
            const userData = JSON.parse(storedUser);
            setCurrentUser({ ...userData, votesRemaining: 5 });
        } else {
            setIsJoining(true);
        }

        socket.on('session-updated', (updatedSession: SessionState) => {
            console.log('Received session-updated via socket:', updatedSession);
            setSession(prev => {
                if (!prev || JSON.stringify(prev) !== JSON.stringify(updatedSession)) {
                    return updatedSession;
                }
                return prev;
            });
        });

        socket.on('participants-updated', (users: User[]) => {
            setParticipants(users);
        });

        socket.on('session-closed', () => {
            alert("The session has been closed by the administrator.");
            navigate('/');
        });

        return () => {

            socket.off('session-closed');
            socket.off('session-updated');
            socket.off('participants-updated');
        };
    }, [sessionId, navigate]);

    useEffect(() => {
        if (!currentUser || !sessionId) return;
        const token = localStorage.getItem('retro_token');
        socket.emit('join-session', { sessionId, user: currentUser, token });
    }, [currentUser?.id, sessionId]);

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
        if (currentUser) {
            if (currentUser.isAdmin) {
                localStorage.setItem(ADMIN_KEY, JSON.stringify(currentUser));
            } else {
                localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
            }
        }
    }, [currentUser]);

    const isAdmin = currentUser?.isAdmin || (session && currentUser && session.adminId === currentUser.id);

    const sortThemesByVotes = (themes: ThemeGroup[]) => {
        return [...themes].sort((a, b) => b.votes - a.votes);
    };

    const handleNextPhase = async () => {
        if (!session || !isAdmin) return;
        setError(null);
        const phases = Object.values(RetroPhase);
        const currentIndex = phases.indexOf(session.phase);

        let updatedSession: SessionState | null = null;

        if (session.phase === RetroPhase.BRAINSTORM) {
            if (session.tickets.length === 0) return setError("Add some cards before grouping!");
            setIsLoading(true);
            try {
                const { themes, ticketAssignments } = await groupTicketsWithAI(socket as any, session.id, session.tickets);
                updatedSession = {
                    ...session,
                    phase: RetroPhase.GROUPING,
                    themes: themes.length > 0 ? themes : [{ id: 'misc', name: 'General', description: 'Miscellaneous topics', votes: 0, voterIds: [] }],
                    tickets: session.tickets.map(t => ({ ...t, themeId: ticketAssignments[t.id] || themes[0]?.id || 'misc' }))
                };
            } catch (e) { setError("Error during AI grouping."); }
            finally { setIsLoading(false); }
        } else if (session.phase === RetroPhase.VOTING) {
            const sortedThemes = sortThemesByVotes(session.themes || []);
            updatedSession = {
                ...session,
                phase: RetroPhase.DISCUSSION,
                themes: sortedThemes,
                currentThemeIndex: 0
            };
        } else if (currentIndex < phases.length - 1) {
            updatedSession = { ...session, phase: phases[currentIndex + 1] };
        }

        if (updatedSession) {
            setSession(updatedSession);
            socket.emit('update-session', { sessionData: updatedSession });
        }
    };

    let votesUsed = 0;
    try {
        votesUsed = (session?.themes || []).reduce((acc, theme) =>
            acc + (theme?.voterIds?.filter(id => id === currentUser?.id)?.length || 0), 0);
    } catch (e) {
        console.error("Defensive catch in votesUsed:", e);
    }
    const votesRemaining = Math.max(0, 5 - votesUsed);

    const userWithVotes: User | null = currentUser ? {
        ...currentUser,
        votesRemaining,
        isAdmin: !!isAdmin
    } : null;

    const handlePhaseManualChange = (targetPhase: RetroPhase) => {
        if (!session || !isAdmin) return;

        let updatedSession = { ...session, phase: targetPhase };

        if (targetPhase === RetroPhase.DISCUSSION) {
            updatedSession.themes = sortThemesByVotes(session.themes || []);
            updatedSession.currentThemeIndex = 0;
        }

        setSession(updatedSession);
        socket.emit('update-session', { sessionData: updatedSession });
    };

    if (isJoining && !currentUser) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900">
            <form onSubmit={(e) => { e.preventDefault(); const n = new FormData(e.currentTarget).get('userName'); if (n) { setCurrentUser({ id: uuidv4(), name: String(n), votesRemaining: 5 }); setIsJoining(false); } }} className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 space-y-8">
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

    if (!session || !currentUser) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600 font-medium">Loading session...</p>
        </div>
    );

    const handleToggleReady = (isReady: boolean) => {
        if (!sessionId) return;
        socket.emit('toggle-ready', { sessionId, isReady });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
            <BoardHeader
                session={session}
                currentUser={userWithVotes!}
                participants={participants}
                isLoading={isLoading}
                error={error}
                onNextPhase={handleNextPhase}
                onReset={() => {
                    if (isAdmin) {
                        socket.emit('close-session', { sessionId: session.id }, (response: any) => {
                            if (response.success) {
                                navigate('/');
                            } else {
                                setError("Failed to close session: " + response.error);
                            }
                        });
                    } else {
                        navigate('/');
                    }
                }}
            />
            <PhaseStepper currentPhase={session.phase} isAdmin={!!isAdmin} onPhaseChange={handlePhaseManualChange} />
            <main className="flex-1 p-6 lg:p-10 overflow-auto">
                {session.phase === RetroPhase.BRAINSTORM && <BrainstormBoard session={session} currentUser={userWithVotes!} participants={participants} onUpdateSession={(s) => { console.log('Emitting update-session (brainstorm)'); setSession(s); socket.emit('update-session', { sessionData: s }); }} onToggleReady={handleToggleReady} />}
                {session.phase === RetroPhase.GROUPING && <GroupingBoard session={session} onUpdateSession={(s) => { console.log('Emitting update-session (grouping)'); setSession(s); socket.emit('update-session', { sessionData: s }); }} />}
                {session.phase === RetroPhase.VOTING && <VotingBoard session={session} currentUser={userWithVotes!} onUpdateSession={(s) => { console.log('Emitting update-session (voting)'); setSession(s); socket.emit('update-session', { sessionData: s }); }} onUpdateUser={setCurrentUser} />}
                {session.phase === RetroPhase.DISCUSSION && <DiscussionBoard session={session} currentUser={userWithVotes!} onUpdateSession={(s) => { console.log('Emitting update-session (discussion)'); setSession(s); socket.emit('update-session', { sessionData: s }); }} />}
            </main>
        </div>
    );
};

export default RetroBoard;
