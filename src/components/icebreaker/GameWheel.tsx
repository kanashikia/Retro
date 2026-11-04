import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IceBreakerGameId } from '../../types';
import { IceBreakerGameMeta } from '../../icebreaker/games';
import Confetti from './Confetti';
import WheelFace from './WheelFace';

interface Props {
  games: IceBreakerGameMeta[];
  targetId: IceBreakerGameId;
  onDone: () => void;
  durationMs?: number;
  /** Full turns before settling on the target. */
  turns?: number;
}

const LANDED_HOLD_MS = 1900;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

// The server already picked the game; this only animates the landing so every
// screen stops on the same segment.
const GameWheel: React.FC<Props> = ({ games, targetId, onDone, durationMs = 4600, turns = 5 }) => {
  const count = Math.max(1, games.length);
  const seg = 360 / count;
  const targetIndex = Math.max(0, games.findIndex(g => g.id === targetId));
  const target = games[targetIndex];

  const finalRotation = useMemo(() => {
    const center = (targetIndex + 0.5) * seg;
    // Land somewhere inside the segment, not always dead center.
    const jitter = (Math.random() - 0.5) * Math.min(seg * 0.6, 50);
    return turns * 360 - center + jitter;
  }, [targetIndex, seg, turns]);

  const [rotation, setRotation] = useState(0);
  const [landed, setLanded] = useState(false);
  const [tick, setTick] = useState(0);
  const lastSegmentRef = useRef(-1);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let frame = 0;
    let doneTimer: ReturnType<typeof setTimeout> | null = null;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const rot = easeOutQuart(t) * finalRotation;
      setRotation(rot);

      const underPointer = Math.floor((((360 - (rot % 360)) % 360) / seg)) % count;
      if (underPointer !== lastSegmentRef.current) {
        lastSegmentRef.current = underPointer;
        setTick(v => v + 1);
      }

      if (t < 1) {
        frame = requestAnimationFrame(step);
      } else {
        setLanded(true);
        doneTimer = setTimeout(() => onDoneRef.current(), LANDED_HOLD_MS);
      }
    };
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [durationMs, finalRotation, seg, count]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] gap-8 select-none"
      role="img"
      aria-label={landed ? `The wheel landed on ${target?.name}` : 'Spinning game wheel'}
    >
      {landed && <Confetti colors={games.map(g => g.color)} />}

      <div className="text-center space-y-2 ib-fade-up">
        <p className="text-xs font-black text-text-muted uppercase tracking-[0.25em]">
          {landed ? 'Tonight we play' : 'Spinning the wheel'}
        </p>
        <h2 className={`text-3xl font-black ${landed ? 'ib-pop' : 'text-text'}`} style={landed ? { color: target?.color } : undefined}>
          {landed ? `${target?.emoji}  ${target?.name}` : 'Fate decides…'}
        </h2>
      </div>

      <WheelFace
        games={games}
        rotation={rotation}
        tick={tick}
        landed={landed}
        targetIndex={targetIndex}
        accent={target?.color}
        spinning={!landed}
      />

      <p className="text-sm text-text-muted font-medium h-5">
        {landed ? target?.tagline : ' '}
      </p>
    </div>
  );
};

export default GameWheel;
