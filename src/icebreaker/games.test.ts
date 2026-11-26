import { describe, it, expect } from 'vitest';
import { isFullHeightGame } from './games';
import { RetroPhase } from '../types';

const session = (phase: RetroPhase, game: any, step: any) => ({ phase, iceBreakerState: { game, step } as any });

describe('isFullHeightGame', () => {
  it('is on while Air Hockey is played', () => {
    expect(isFullHeightGame(session(RetroPhase.ICE_BREAKER, 'airhockey', 'play'))).toBe(true);
  });

  it('is off in the lobby, after the ice breaker, and for games that keep the board header', () => {
    expect(isFullHeightGame(session(RetroPhase.ICE_BREAKER, 'airhockey', 'lobby'))).toBe(false);
    expect(isFullHeightGame(session(RetroPhase.BRAINSTORM, 'airhockey', 'play'))).toBe(false);
    expect(isFullHeightGame(session(RetroPhase.ICE_BREAKER, 'emoji', 'play'))).toBe(false);
    expect(isFullHeightGame(session(RetroPhase.ICE_BREAKER, 'tinyfps', 'play'))).toBe(false);
    expect(isFullHeightGame({ phase: RetroPhase.ICE_BREAKER, iceBreakerState: undefined } as any)).toBe(false);
  });
});
