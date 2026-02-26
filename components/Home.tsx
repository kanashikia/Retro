import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Plus, History, LogOut } from 'lucide-react';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        const storedAdmin = localStorage.getItem('retro_admin');
        const token = localStorage.getItem('retro_token');

        if (!storedAdmin || !token) {
            navigate('/login');
        } else {
            const adminData = JSON.parse(storedAdmin);
            setAdmin(adminData);
            fetchHistory(adminData.id, token);
        }
    }, [navigate]);

    const fetchHistory = async (adminId: string, token: string) => {
        try {
            const response = await fetch(`/api/sessions/history/${adminId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const data = await response.json();
                    setHistory(data);
                } else {
                    console.error("Non-JSON response for history:", await response.text());
                }
            } else if (response.status === 401) {
                handleLogout();
            }
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    };

    // Note: The following 'votesUsed' calculation seems to be intended for a different component
    // where 'session' and 'currentUser' are defined. Placing it here would cause a syntax error
    // and runtime errors due to undefined variables.
    // As per the instruction to make the change faithfully, I'm placing it as close as possible
    // to the requested location, but it will need context-specific variables to function.
    // let votesUsed = 0;
    // try {
    //     votesUsed = (session?.themes || []).reduce((acc, theme) =>
    //         acc + (theme?.voterIds?.filter(id => id === currentUser?.id)?.length || 0), 0);
    // } catch (e) {
    //     console.error("Defensive catch in votesUsed:", e);
    // }
    // const votesRemaining = Math.max(0, 5 - votesUsed);

    const handleCreateSession = async () => {
        const newId = uuidv4();
        const token = localStorage.getItem('retro_token');
        if (!token) {
            navigate('/login');
            return;
        }
        try {
            const response = await fetch('/api/sessions/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ sessionId: newId }),
            });
            if (response.ok) {
                navigate(`/retro/${newId}`);
            } else {
                const contentType = response.headers.get("content-type");
                const errorText = contentType && contentType.includes("application/json")
                    ? (await response.json()).message
                    : await response.text();

                if (response.status === 401) {
                    handleLogout();
                } else {
                    console.error("Failed to pre-create session:", errorText);
                }
            }
        } catch (error) {
            console.error("Error creating session:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('retro_token');
        localStorage.removeItem('retro_admin');
        navigate('/login');
    };

    if (!admin) return null;

    return (
        <div className="min-h-screen flex flex-col text-text transition-colors duration-300">
            <nav className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <LayoutDashboard className="text-white w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold tracking-tight leading-none text-text">Retro Dashboard</span>
                        <span className="text-[10px] font-bold text-primary mt-1 uppercase tracking-widest">Version 1.0.3 - Responsive Sync Active</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right mr-2">
                        <p className="text-sm font-bold text-text">{admin.name}</p>
                        <p className="text-xs text-text-muted uppercase tracking-widest font-bold">Administrator</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <LogOut className="w-6 h-6" />
                    </button>
                </div>
            </nav>

            <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 space-y-10">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Create Session Card */}
                    <button
                        onClick={handleCreateSession}
                        className="group relative bg-primary p-8 rounded-[32px] overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98] text-left shrink-0"
                    >
                        <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10 space-y-6">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Plus className="text-white w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-white">New Session</h2>
                                <p className="text-white/80 leading-relaxed font-medium">Start a fresh, AI-powered retrospective session with your team right now.</p>
                            </div>
                        </div>
                    </button>

                    {/* Past Sessions */}
                    <div className="bg-surface p-8 rounded-[32px] border border-border shadow-sm space-y-6 flex flex-col h-[400px]">
                        <div className="flex items-center justify-between">
                            <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center">
                                <History className="text-text-muted w-8 h-8" />
                            </div>
                        </div>
                        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                            <h2 className="text-3xl font-bold">Recent History</h2>
                            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                {history.length > 0 ? (
                                    history.map((session, index) => {
                                        const sessionId = session?.sessionId || session?.id;
                                        const label = typeof sessionId === 'string' ? sessionId.split('-')[0] : `#${index + 1}`;
                                        const updatedAt = session?.updatedAt ? new Date(session.updatedAt) : null;

                                        return (
                                            <div key={sessionId || `history-${index}`} className="p-4 bg-background rounded-2xl border border-border flex items-center justify-between hover:border-primary/30 transition-colors group">
                                                <div className="space-y-1">
                                                    <p className="font-bold text-text">Session {label}</p>
                                                    <p className="text-xs text-text-muted font-medium">
                                                        {updatedAt && !Number.isNaN(updatedAt.getTime())
                                                            ? `${updatedAt.toLocaleDateString()} at ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                                            : 'Date unavailable'}
                                                    </p>
                                                </div>
                                                {sessionId ? (
                                                    <Link to={`/retro/${sessionId}`} className="px-4 py-2 bg-surface text-primary border border-border rounded-xl text-sm font-bold hover:bg-primary hover:text-white hover:border-primary transition-all opacity-0 group-hover:opacity-100">
                                                        View
                                                    </Link>
                                                ) : null}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-4 bg-background rounded-2xl border border-border flex items-center justify-between">
                                        <span className="text-text-muted font-medium italic">Your recent retrospectives will appear here.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tip Section */}
                <div className="bg-primary/5 p-6 rounded-[24px] border border-primary/10 flex items-start gap-4">
                    <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center shadow-sm shrink-0">
                        <span className="text-xl">💡</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-text">Pro Tip</h3>
                        <p className="text-text-muted text-sm leading-relaxed">
                            Admins can control phases using the stepper at the top. Use AI grouping once your team has added enough cards to see semantic patterns!
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Home;
