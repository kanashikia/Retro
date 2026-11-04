import React from 'react';

interface Props {
  /** Second, smaller line under "NEW" (e.g. "games"). */
  sub?: string;
  /** Grey version, for a disabled or unchecked context. */
  muted?: boolean;
  /** Where the sticker sits: overlapping a card corner, or inside a card that clips its overflow. */
  position?: 'corner-left' | 'corner-right' | 'inside';
  /** Background, usually the host element's accent color. Defaults to the theme primary. */
  color?: string;
  /** Text color, for light backgrounds. Defaults to white. */
  textColor?: string;
}

// Left-pinned stickers lean left, right-pinned ones lean right.
const POSITIONS: Record<NonNullable<Props['position']>, string> = {
  'corner-left': '-top-2.5 -left-2.5 rotate-[-12deg]',
  'corner-right': '-top-2.5 -right-2.5 rotate-[12deg]',
  inside: 'top-2 right-2 rotate-[12deg]',
};

// Small round sticker, slightly tilted, pinned to a card corner by the parent
// (which must be `relative`).
const NewBadge: React.FC<Props> = ({ sub, muted = false, position = 'corner-right', color = 'var(--color-primary)', textColor = '#ffffff' }) => (
  <span
    className={`absolute z-10 flex flex-col items-center justify-center rounded-full border-2 border-surface shadow-sm select-none transition-colors duration-300
      ${POSITIONS[position]} ${sub ? 'w-11 h-11' : 'w-9 h-9'} ${muted ? 'bg-secondary text-text-muted' : ''}`}
    style={muted ? undefined : { background: color, color: textColor }}
    aria-label={sub ? `New ${sub}` : 'New'}
  >
    <span className="text-[9px] font-black uppercase leading-none tracking-wide">New</span>
    {sub && <span className="text-[8px] font-bold leading-none mt-0.5 opacity-90">{sub}</span>}
  </span>
);

export default NewBadge;
