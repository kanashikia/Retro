import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogIn, UserPlus, CheckCircle2 } from 'lucide-react';

const Login: React.FC = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password,
                    ...(isRegistering && { email })
                }),
            });

            // Handle non-JSON responses or empty responses (e.g. server down)
            const contentType = response.headers.get("content-type");
            let data: any = {};

            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(text || `Server returned ${response.status} ${response.statusText}`);
            }

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            if (isRegistering) {
                setSuccess('Account created! Please login.');
                setIsRegistering(false);
            } else {
                localStorage.setItem('retro_token', data.token);
                localStorage.setItem('retro_admin', JSON.stringify({ id: data.id, name: data.username, isAdmin: true, votesRemaining: 5 }));
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>

            <div className="max-w-md w-full relative">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[32px] shadow-2xl space-y-8">
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
                            <LayoutDashboard className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            {isRegistering ? 'Create Admin' : 'Admin Login'}
                        </h1>
                        <p className="text-slate-400">
                            {isRegistering ? 'Setup your retrospective dashboard' : 'Welcome back, sign in to continue'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm text-center">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-sm flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {success}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoFocus
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                placeholder="admin_user"
                            />
                        </div>

                        {isRegistering && (
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                    placeholder="your@email.com"
                                />
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        {!isRegistering && (
                            <div className="flex justify-end">
                                <a href="/forgot-password" className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors">
                                    Forgot Password?
                                </a>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-indigo-500 hover:bg-indigo-400 active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 mt-4"
                        >
                            {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                            {isRegistering ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="text-center">
                        <button
                            onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess(''); }}
                            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                        >
                            {isRegistering ? 'Already have an account? Sign in' : 'New admin? Create an account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
