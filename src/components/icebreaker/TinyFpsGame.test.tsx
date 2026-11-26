import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TinyFpsGame from './TinyFpsGame';
import { RetroPhase } from '../../types';

const game = vi.hoisted(() => ({ tinyFps: vi.fn() }));
vi.mock('@korial29/tiny-fps', () => ({ tinyFps: game.tinyFps }));
const io = vi.hoisted(() => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }));
vi.mock('../../services/socket', () => ({ socket: io }));

const ana = { id: 'u1', name: 'Ana', isAdmin: false, votesRemaining: 5 };
const session = (iceBreakerState: any) => ({
  id: 's1', phase: RetroPhase.ICE_BREAKER, tickets: [], themes: [], currentThemeIndex: 0, adminId: 'u2', hasIceBreaker: true,
  iceBreakerState: { game: 'tinyfps', questions: [], currentIndex: 0, ...iceBreakerState },
});

const renderGame = (state: any, { isAdmin = false } = {}) => {
  const props = {
    session: session(state) as any, participants: [ana] as any, isAdmin, isStarting: false,
    onStart: vi.fn(), onStartRetro: vi.fn(), onChangeGame: vi.fn(),
  };
  return { props, ...render(<TinyFpsGame {...props} />) };
};

afterEach(() => vi.clearAllMocks());

describe('TinyFpsGame', () => {
  it('lets the admin pick the map in the lobby, and never loads the game here', () => {
    renderGame({ step: 'lobby', fpsMap: 'tranquility' }, { isAdmin: true });
    expect(screen.getByRole('radio', { name: /Tranquility/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: /Landfall/ }));
    expect(io.emit).toHaveBeenCalledWith('tinyfps:map', { sessionId: 's1', map: 'landfall' });
    expect(game.tinyFps).not.toHaveBeenCalled();
  });

  it('shows the map read-only to everyone else, Highline by default', () => {
    renderGame({ step: 'lobby' });
    expect(screen.getByRole('radio', { name: /Highline/ })).toHaveAttribute('aria-checked', 'true');
    screen.getAllByRole('radio').forEach(r => expect(r).toBeDisabled());
    expect(screen.queryByRole('button', { name: /Start the game/ })).not.toBeInTheDocument();
  });

  it('once on, opens the game in a new tab with the ticket in the hash', async () => {
    io.emit.mockImplementation((ev: string, _: unknown, ack?: (r: unknown) => void) => {
      if (ev === 'tinyfps:ticket') ack?.({ ticket: 'a.b/c' });
    });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderGame({ step: 'play', fpsMap: 'landfall' });
    expect(io.emit).toHaveBeenCalledWith('tinyfps:ticket', { sessionId: 's1' }, expect.any(Function));
    const button = screen.getByRole('button', { name: /Open the game/ });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(open).toHaveBeenCalledWith('/fps.html#t=a.b%2Fc', '_blank', 'noopener');
    expect(screen.getByText(/Landfall: capture the flag/)).toBeInTheDocument();
    expect(game.tinyFps).not.toHaveBeenCalled();
    io.emit.mockReset();
  });
});
