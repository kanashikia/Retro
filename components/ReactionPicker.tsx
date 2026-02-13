
import React, { useState } from 'react';
import { Smile } from 'lucide-react';

interface Props {
    onSelect: (emoji: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😮', '😂', '😢', '🚀', '✅'];

const ReactionPicker: React.FC<Props> = ({ onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative inline-block">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                title="Add reaction"
            >
                <Smile className="w-4 h-4" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute bottom-full mb-2 left-0 z-20 bg-white border border-slate-200 p-2 rounded-xl shadow-xl flex gap-1 animate-in zoom-in-95 slide-in-from-bottom-2">
                        {COMMON_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(emoji);
                                    setIsOpen(false);
                                }}
                                className="p-1.5 hover:bg-slate-50 rounded-lg transition-transform hover:scale-125 text-lg leading-none"
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
