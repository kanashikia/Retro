import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WouldYouRatherGame from './WouldYouRatherGame';
import { RetroPhase } from '../../types';

const ana = { id: 'u1', name: 'Ana', isAdmin: false, votesRemaining: 5 };
const participants = [ana, { id: 'u2', name: 'Basile', isAdmin: false, votesRemaining: 5 }, { id: 'u3', name: 'Chloé', isAdmin: false, votesRemaining: 5 }];
const dilemmas = [{ a: 'Mer', b: 'Montagne' }, { a: 'Thé', b: 'Café' }];

const session = (iceBreakerState: any) => ({
  id: 's1', phase: RetroPhase.ICE_BREAKER, tickets: [], themes: [], currentThemeIndex: 0, adminId: 'u1', hasIceBreaker: true,
  iceBreakerState: { game: 'wyr', questions: [], currentIndex: 0, ...iceBreakerState },
});

const renderGame = (state: any, { isAdmin = false } = {}) => {
  const props = {
    session: session(state) as any, currentUser: ana as any, participants: participants as any, isAdmin, isStarting: false,
    onStart: vi.fn(), onSubmit: vi.fn(), onAdvance: vi.fn(), onSkip: vi.fn(), onStartRetro: vi.fn(), onChangeGame: vi.fn(),
  };
  render(<WouldYouRatherGame {...props} />);
  return props;
};

describe('WouldYouRatherGame', () => {
  it('lets a player vote once', () => {
    const props = renderGame({ step: 'play', round: 0, dilemmas, roundStartedAt: Date.now(), submissions: {} });
    fireEvent.click(screen.getByRole('button', { name: 'Option B: Montagne' }));
    expect(props.onSubmit).toHaveBeenCalledWith('b', expect.any(Function));
    expect(screen.getByRole('button', { name: 'Option A: Mer' })).toBeDisabled();
  });

  it('shows the split and the names on reveal', () => {
    const props = renderGame({
      step: 'reveal', round: 0, dilemmas,
      submissions: { '0': { u1: { text: 'a', at: 1 }, u2: { text: 'b', at: 2 }, u3: { text: 'b', at: 3 } } },
      players: { u1: 'Ana', u2: 'Basile', u3: 'Chloé' },
    }, { isAdmin: true });
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText('Basile, Chloé')).toBeInTheDocument();
    expect(screen.getByText('One brave soul against everyone.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Next dilemma/ }));
    expect(props.onAdvance).toHaveBeenCalled();
  });

  it('crowns mavericks and the herd at the end', () => {
    renderGame({
      step: 'done', round: 1, dilemmas,
      submissions: {
        '0': { u1: { text: 'a', at: 1 }, u2: { text: 'b', at: 2 }, u3: { text: 'b', at: 3 } },
        '1': { u1: { text: 'a', at: 1 }, u2: { text: 'b', at: 2 }, u3: { text: 'b', at: 3 } },
      },
      players: { u1: 'Ana', u2: 'Basile', u3: 'Chloé' },
    }, { isAdmin: true });
    expect(screen.getByText('🦄 Mavericks')).toBeInTheDocument();
    expect(screen.getByText('2× against the crowd')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Never unanimous' })).toBeInTheDocument();
  });
});
