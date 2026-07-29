
import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

interface Props {
    onSelect: (emoji: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😮', '😂', '😢', '🚀', '✅'];
// Roughly the rendered width of the row: 8 emoji buttons + padding. Used to keep the
// popover inside a narrow viewport instead of running off the right edge.
const PICKER_WIDTH = 300;
const VIEWPORT_MARGIN = 8;

const ReactionPicker: React.FC<Props> = ({ onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const maxLeft = window.innerWidth - PICKER_WIDTH - VIEWPORT_MARGIN;
            setPos({
                top: rect.top - 4,
                left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, maxLeft))
            });
        }
    }, [isOpen]);

    return (
        <div className="relative inline-block">
            <button
                ref={btnRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-2 text-text-muted hover:text-primary hover:bg-secondary rounded-lg transition-all touch-manipulation"
                title="Add reaction"
                aria-label="Add reaction"
            >
                <Smile className="w-4 h-4" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        className="fixed z-50 bg-surface border border-border p-2 rounded-xl shadow-xl flex gap-1"
                        style={{ top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
                    >
                        {COMMON_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(emoji);
                                    setIsOpen(false);
                                }}
                                className="p-2 hover:bg-secondary rounded-lg transition-transform hover:scale-125 text-lg leading-none touch-manipulation"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default ReactionPicker;
