
import React from 'react';

interface Props {
    emoji: string;
    userIds: string[];
    currentUserId: string;
    onToggle: (emoji: string) => void;
}

const ReactionBadge: React.FC<Props> = ({ emoji, userIds, currentUserId, onToggle }) => {
    const hasReacted = userIds.includes(currentUserId);
    const count = userIds.length;

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onToggle(emoji);
            }}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-all active:scale-90
        ${hasReacted
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'}`}
        >
            <span>{emoji}</span>
            <span className={hasReacted ? 'font-bold' : ''}>{count}</span>
        </button>
    );
};

export default ReactionBadge;
