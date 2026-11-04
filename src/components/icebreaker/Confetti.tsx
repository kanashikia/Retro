import React, { useMemo } from 'react';

interface Props {
  colors?: string[];
  count?: number;
}

const DEFAULT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#facc15'];

// Pure CSS confetti burst. The parent unmounts it when the party is over.
const Confetti: React.FC<Props> = ({ colors = DEFAULT_COLORS, count = 70 }) => {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 2.2 + Math.random() * 1.4,
    size: 6 + Math.random() * 8,
    drift: (Math.random() - 0.5) * 240,
    spin: 360 + Math.random() * 720,
    color: colors[i % colors.length],
    round: Math.random() > 0.5,
  })), [count, colors]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 0.5),
            backgroundColor: p.color,
            borderRadius: p.round ? '9999px' : '2px',
            animation: `ib-confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            ['--ib-drift' as string]: `${p.drift}px`,
            ['--ib-spin' as string]: `${p.spin}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default Confetti;
