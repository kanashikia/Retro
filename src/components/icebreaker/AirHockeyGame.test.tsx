import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AirHockeyGame from './AirHockeyGame';
import { RetroPhase } from '../../types';

const game = vi.hoisted(() => ({ airHockey: vi.fn(), destroy: vi.fn() }));
vi.mock('air-hockey', () => ({
  airHockey: game.airHockey.mockImplementation(() => ({ destroy: game.destroy, on: vi.fn() })),
}));
vi.mock('../../services/socket', () => ({
  socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));

const ana = { id: 'u1', name: 'Ana', isAdmin: false, votesRemaining: 5 };
const session = (iceBreakerState: any) => ({
  id: 's1', phase: RetroPhase.ICE_BREAKER, tickets: [], themes: [], currentThemeIndex: 0, adminId: 'u2', hasIceBreaker: true,
  iceBreakerState: { game: 'airhockey', questions: [], currentIndex: 0, ...iceBreakerState },
});

const renderGame = (state: any, { isAdmin = false } = {}) => {
  const props = {
    session: session(state) as any, currentUser: ana as any, participants: [ana] as any, isAdmin, isStarting: false,
    onStart: vi.fn(), onStartRetro: vi.fn(), onChangeGame: vi.fn(),
  };
  return { props, ...render(<AirHockeyGame {...props} />) };
};

describe('AirHockeyGame', () => {
  it('waits in the lobby, without loading the game', () => {
    renderGame({ step: 'lobby' }, { isAdmin: true });
    expect(screen.getByRole('button', { name: /Start the game/ })).toBeInTheDocument();
    expect(game.airHockey).not.toHaveBeenCalled();
  });

  it('loads the game once it is on, under the player name, and destroys it on leave', async () => {
    const { unmount } = renderGame({ step: 'play' });
    await waitFor(() => expect(game.airHockey).toHaveBeenCalledOnce());
    const [el, opts] = game.airHockey.mock.calls[0];
    expect(el).toBeInstanceOf(HTMLDivElement);
    expect(opts.name).toBe('Ana');
    expect(opts.socket.binaryType).toBe('arraybuffer');
    expect(screen.getByText('Waiting for the admin to start the retro...')).toBeInTheDocument();
    unmount();
    expect(game.destroy).toHaveBeenCalledOnce();
  });
});
