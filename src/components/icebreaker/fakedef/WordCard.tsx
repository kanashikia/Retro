import React from 'react';

const WordCard: React.FC<{ word?: string; color: string }> = ({ word, color }) => (
  <div className="w-full max-w-xl bg-surface border-2 rounded-3xl p-8 text-center ib-pop shadow-2xl" style={{ borderColor: color, boxShadow: `0 25px 60px -30px ${color}` }}>
    <p className="text-xs font-black text-text-muted uppercase tracking-[0.25em] mb-3">The word</p>
    <div className="text-5xl font-black text-text">{word}</div>
  </div>
);

export default WordCard;
