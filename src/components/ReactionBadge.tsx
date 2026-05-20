
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
                    ? 'bg-secondary border-primary/20 text-primary shadow-sm'
                    : 'bg-surface border-border text-text-muted hover:border-text-muted/50'}`}
        >
            <span>{emoji}</span>
            <span className={hasReacted ? 'font-bold' : ''}>{count}</span>
        </button>
    );
};

export default ReactionBadge;
