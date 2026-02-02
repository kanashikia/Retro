import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Plus, History, LogOut } from 'lucide-react';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState<any>(null);

    useEffect(() => {
        const storedAdmin = localStorage.getItem('retro_admin');
        const token = localStorage.getItem('retro_token');

        if (!storedAdmin || !token) {
            navigate('/login');
        } else {
            setAdmin(JSON.parse(storedAdmin));
        }
    }, [navigate]);

    const handleCreateSession = () => {
        const newId = crypto.randomUUID();
        navigate(`/retro/${newId}`);
    };

    const handleLogout = () => {
        localStorage.removeItem('retro_token');
        localStorage.removeItem('retro_admin');
        navigate('/login');
    };

    if (!admin) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <LayoutDashboard className="text-white w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Retro Dashboard</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right mr-2">
                        <p className="text-sm font-bold">{admin.name}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Administrator</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <LogOut className="w-6 h-6" />
                    </button>
                </div>
            </nav>

            <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 space-y-10">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Create Session Card */}
                    <button
                        onClick={handleCreateSession}
                        className="group relative bg-indigo-600 p-8 rounded-[32px] overflow-hidden transition-all hover:shadow-2xl hover:shadow-indigo-200 active:scale-[0.98] text-left"
                    >
                        <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10 space-y-6">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Plus className="text-white w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-white">New Session</h2>
                                <p className="text-indigo-100/80 leading-relaxed font-medium">Start a fresh, AI-powered retrospective session with your team right now.</p>
                            </div>
                        </div>
                    </button>

                    {/* Past Sessions (Placeholder for now) */}
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <History className="text-slate-600 w-8 h-8" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold">Recent History</h2>
                            <div className="space-y-2">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                    <span className="text-slate-400 font-medium italic">Your recent retrospectives will appear here.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tip Section */}
                <div className="bg-indigo-50 p-6 rounded-[24px] border border-indigo-100 flex items-start gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                        <span className="text-xl">💡</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-indigo-900">Pro Tip</h3>
                        <p className="text-indigo-800/70 text-sm leading-relaxed">
                            Admins can control phases using the stepper at the top. Use AI grouping once your team has added enough cards to see semantic patterns!
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Home;
