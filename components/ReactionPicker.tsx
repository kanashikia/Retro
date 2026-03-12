
import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

interface Props {
    onSelect: (emoji: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😮', '😂', '😢', '🚀', '✅'];

const ReactionPicker: React.FC<Props> = ({ onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({
                top: rect.top - 4,
                left: rect.left
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
                className="p-1.5 text-text-muted hover:text-primary hover:bg-secondary rounded-lg transition-all"
                title="Add reaction"
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
                                className="p-1.5 hover:bg-secondary rounded-lg transition-transform hover:scale-125 text-lg leading-none"
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
