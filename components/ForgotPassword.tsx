import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Determine if 429 (Too Many Requests)
                if (response.status === 429) {
                    throw new Error(data.message || 'Too many requests. Please try again later.');
                }
                // For security, even if email not found (though backend handles this),
                // we might display the generic message. BUT if it is a 500 error, show generic error.
                // Ideally backend sends 200 even if user not found.
                // If backend sent error (like DB connection), we show it.
                if (response.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                }
                // If not 200 and not 500/429, just show data.message if appropriate
                throw new Error(data.message || 'Something went wrong');
            }

            setMessage(data.message);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>

            <div className="max-w-md w-full relative">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[32px] shadow-2xl space-y-8">
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
                            <Mail className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            Reset Password
                        </h1>
                        <p className="text-slate-400">
                            Enter your email to receive a reset link
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm text-center">
                                {error}
                            </div>
                        )}
                        {message && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-sm flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {message}
                            </div>
                        )}

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

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full bg-indigo-500 hover:bg-indigo-400 active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 mt-4 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className="text-center">
                        <Link
                            to="/login"
                            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
