
import React, { useState, useEffect } from 'react';
import { Timer as TimerIcon, AlertCircle } from 'lucide-react';

interface Props {
    endsAt: number | null;
}

const Timer: React.FC<Props> = ({ endsAt }) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!endsAt) {
            setTimeLeft(null);
            return;
        }

        const calculateTimeLeft = () => {
            const now = Date.now();
            const difference = endsAt - now;
            return difference > 0 ? Math.floor(difference / 1000) : 0;
        };

        setTimeLeft(calculateTimeLeft());

        const interval = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [endsAt]);

    if (timeLeft === null) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const isUrgent = timeLeft < 15 && timeLeft > 0;
    const isFinished = timeLeft === 0;

    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-all shadow-sm ${isFinished
            ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
            : isUrgent
                ? 'bg-amber-50 text-amber-700 border-amber-200 animate-bounce'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
            {isFinished ? <AlertCircle className="w-4 h-4" /> : <TimerIcon className="w-4 h-4" />}
            <span className="font-mono text-lg">
                {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
        </div>
    );
};

export default Timer;
