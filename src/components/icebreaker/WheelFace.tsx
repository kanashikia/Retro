import React from 'react';
import { IceBreakerGameMeta } from '../../icebreaker/games';

export const WHEEL_SIZE = 360;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = CENTER - 14;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const pointAt = (angleDeg: number, r: number) => ({
  // 0° = top, clockwise
  x: CENTER + r * Math.sin(toRad(angleDeg)),
  y: CENTER - r * Math.cos(toRad(angleDeg)),
});

const segmentPath = (startDeg: number, endDeg: number) => {
  const s = pointAt(startDeg, RADIUS);
  const e = pointAt(endDeg, RADIUS);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${s.x} ${s.y} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${e.x} ${e.y} Z`;
};

interface Props {
  games: IceBreakerGameMeta[];
  /** Current rotation in degrees (clockwise). */
  rotation: number;
  /** Increments each time a segment passes under the pointer; drives the lights and the pointer tick. */
  tick: number;
  landed: boolean;
  targetIndex: number;
  /** Segments become clickable; used by the setup screen to bench games. */
  interactive?: boolean;
  onSegmentClick?: (game: IceBreakerGameMeta) => void;
  /** Color of the glow and the pointer dot; the picked game's color once landed. */
  accent?: string;
  spinning?: boolean;
}

// The drawing of the wheel itself: rim, lights, slices with one emoji each,
// hub and pointer. Shared by the spinning wheel and the setup screen.
const WheelFace: React.FC<Props> = ({ games, rotation, tick, landed, targetIndex, interactive = false, onSegmentClick, accent, spinning = false }) => {
  const count = Math.max(1, games.length);
  const seg = 360 / count;
  const lights = Array.from({ length: 24 }, (_, i) => pointAt(i * 15, RADIUS + 9));
  const emojiSize = count <= 4 ? 48 : count <= 6 ? 40 : 32;

  return (
    <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
      {/* Pointer: a white teardrop pinned at the top */}
      <div
        key={tick}
        className={`absolute -top-4 left-1/2 z-20 ${spinning ? 'ib-pointer-tick' : ''}`}
        style={{ transform: 'translateX(-50%)', transformOrigin: '50% 20%' }}
      >
        <svg width="36" height="48" viewBox="0 0 36 48" style={{ filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.35))' }}>
          <path d="M18 2 C8 2 2 9 2 17 C2 27 18 46 18 46 C18 46 34 27 34 17 C34 9 28 2 18 2 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
          <circle cx="18" cy="17" r="5" fill={landed ? (accent ?? '#0f172a') : '#0f172a'} />
        </svg>
      </div>

      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl transition-opacity duration-700"
        style={{ background: accent ?? '#6366f1', opacity: landed ? 0.5 : 0.18 }}
      />

      <div className="relative z-10" style={{ filter: 'drop-shadow(0 14px 18px rgba(0,0,0,0.3))' }}>
        <svg
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
          style={{ transform: `rotate(${rotation}deg)`, willChange: 'transform', display: 'block' }}
          aria-hidden={interactive ? undefined : true}
        >
          <defs>
            <filter id="ib-light-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
            <linearGradient id="ib-rim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <radialGradient id="ib-sheen" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
            </radialGradient>
            <radialGradient id="ib-hub" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </radialGradient>
            <clipPath id="ib-disc">
              <circle cx={CENTER} cy={CENTER} r={RADIUS} />
            </clipPath>
          </defs>

          {/* Rim with lights */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 14} fill="url(#ib-rim)" />
          {lights.map((p, i) => {
            const on = i % 2 === (Math.floor(tick / 2) % 2);
            return (
              <g key={i}>
                {on && <circle cx={p.x} cy={p.y} r={5} fill="#fde68a" opacity={0.6} filter="url(#ib-light-glow)" />}
                <circle cx={p.x} cy={p.y} r={3} fill={on ? '#fef3c7' : '#f59e0b'} opacity={on ? 1 : 0.7} />
              </g>
            );
          })}

          {/* Slices: one color each, emoji only */}
          <g clipPath="url(#ib-disc)">
            {count === 1 ? (
              <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={games[0]?.color ?? '#6366f1'} />
            ) : (
              games.map((g, i) => (
                <path key={g.id} d={segmentPath(i * seg, (i + 1) * seg)} fill={g.color} />
              ))
            )}
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#ib-sheen)" style={{ pointerEvents: 'none' }} />
            {count > 1 && games.map((g, i) => (
              <path key={`${g.id}-sep`} d={segmentPath(i * seg, (i + 1) * seg)} fill="none" stroke="#ffffff" strokeWidth={4} strokeOpacity={0.9} style={{ pointerEvents: 'none' }} />
            ))}
            {landed && count > 1 && (
              <path d={segmentPath(targetIndex * seg, (targetIndex + 1) * seg)} fill="#ffffff" fillOpacity={0.22} className="ib-fade-in" style={{ pointerEvents: 'none' }} />
            )}
          </g>

          {games.map((g, i) => {
            const angle = (i + 0.5) * seg;
            const pos = pointAt(angle, RADIUS * 0.62);
            return (
              <text
                key={`${g.id}-emoji`}
                x={pos.x}
                y={pos.y}
                fontSize={emojiSize}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${angle} ${pos.x} ${pos.y})`}
                style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.25))', pointerEvents: 'none' }}
              >
                {g.emoji}
              </text>
            );
          })}

          {/* Clickable overlays, drawn last so they sit above everything in the slice */}
          {interactive && games.map((g, i) => (
            <path
              key={`${g.id}-hit`}
              d={count === 1 ? `M ${CENTER - RADIUS} ${CENTER} a ${RADIUS} ${RADIUS} 0 1 0 ${RADIUS * 2} 0 a ${RADIUS} ${RADIUS} 0 1 0 ${-RADIUS * 2} 0` : segmentPath(i * seg, (i + 1) * seg)}
              fill="#ffffff"
              fillOpacity={0}
              role="button"
              tabIndex={0}
              aria-label={`Take ${g.name} out of the wheel`}
              className="cursor-pointer transition-[fill-opacity] duration-200 hover:[fill-opacity:0.25] focus-visible:[fill-opacity:0.25] outline-none"
              onClick={() => onSegmentClick?.(g)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSegmentClick?.(g); } }}
            />
          ))}

          {/* Hub */}
          <circle cx={CENTER} cy={CENTER} r={44} fill="#0f172a" opacity={0.9} style={{ pointerEvents: 'none' }} />
          <circle cx={CENTER} cy={CENTER} r={38} fill="url(#ib-hub)" style={{ pointerEvents: 'none' }} />
          <circle cx={CENTER} cy={CENTER} r={38} fill="none" stroke={landed ? (accent ?? '#ffffff') : '#ffffff'} strokeWidth={3} opacity={0.9} style={{ pointerEvents: 'none' }} />
          <text x={CENTER} y={CENTER + 1} fontSize={30} textAnchor="middle" dominantBaseline="central" style={{ pointerEvents: 'none' }}>🎲</text>
        </svg>
      </div>
    </div>
  );
};

export default WheelFace;
