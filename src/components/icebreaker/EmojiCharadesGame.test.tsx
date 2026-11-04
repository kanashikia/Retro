import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EmojiCharadesGame from './EmojiCharadesGame';
import { RetroPhase } from '../../types';

const participants = [
  { id: 'u1', name: 'Ana', isAdmin: false, votesRemaining: 5 },
  { id: 'u2', name: 'Basile', isAdmin: false, votesRemaining: 5 },
];

const charades = [
  { emojis: '🦁👑🌅' },
  { emojis: '🚢🧊💑' },
];

const session = (iceBreakerState: any) => ({
  id: 's1', phase: RetroPhase.ICE_BREAKER, tickets: [], themes: [], currentThemeIndex: 0, adminId: 'u1', hasIceBreaker: true,
  iceBreakerState: { game: 'emoji', questions: [], currentIndex: 0, ...iceBreakerState },
});

const renderGame = (state: any, { isAdmin = false, me = participants[0] } = {}) => {
  const props = {
    session: session(state) as any,
    currentUser: me as any,
    participants: participants as any,
    isAdmin,
    isStarting: false,
    onStart: vi.fn(),
    onSubmit: vi.fn(),
    onAdvance: vi.fn(), onSkip: vi.fn(),
    onStartRetro: vi.fn(),
    onChangeGame: vi.fn(),
  };
  render(<EmojiCharadesGame {...props} />);
  return props;
};

describe('EmojiCharadesGame', () => {
  it('lets the admin start from the lobby and keeps participants waiting', () => {
    const admin = renderGame({ step: 'lobby' }, { isAdmin: true });
    fireEvent.click(screen.getByRole('button', { name: /Start the game/ }));
    expect(admin.onStart).toHaveBeenCalled();
  });

  it('shows the emojis and submits a guess', () => {
    const props = renderGame({ step: 'play', round: 0, charades, roundStartedAt: Date.now(), submissions: {} });
    expect(screen.getByText('🦁👑🌅')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your guess'), { target: { value: 'roi lion' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guess' }));
    expect(props.onSubmit).toHaveBeenCalledWith('roi lion', expect.any(Function));
  });

  it('re-enables the input when the server refuses the guess', () => {
    const props = renderGame({ step: 'play', round: 0, charades, roundStartedAt: Date.now(), submissions: {} });
    props.onSubmit.mockImplementation((_text: string, onRejected: () => void) => onRejected());
    fireEvent.change(screen.getByLabelText('Your guess'), { target: { value: 'roi lion' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guess' }));
    expect(screen.getByLabelText('Your guess')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Guess' })).toBeEnabled();
  });

  it('shows my result and hides the input once I answered', () => {
    renderGame({
      step: 'play', round: 0, charades, roundStartedAt: Date.now(),
      submissions: { '0': { u1: { text: 'roi lion', correct: true, rank: 1, points: 10, at: 1 }, u2: { correct: false, rank: 0, points: 0, at: 2 } } },
    });
    expect(screen.getByRole('status')).toHaveTextContent('Got it! #1');
    expect(screen.queryByLabelText('Your guess')).not.toBeInTheDocument();
    expect(screen.getByText('✗ Basile')).toBeInTheDocument();
  });

  it('reveals the answer, the round ranking and the leaderboard', () => {
    const props = renderGame({
      step: 'reveal', round: 0,
      charades: [{ emojis: '🦁👑🌅', answer: 'Le Roi Lion', accepted: [] }, charades[1]],
      submissions: { '0': { u1: { text: 'roi lion', correct: true, rank: 1, points: 10, at: 1 }, u2: { text: 'bambi', correct: false, rank: 0, points: 0, at: 2 } } },
      scores: { u1: 10, u2: 0 }, players: { u1: 'Ana', u2: 'Basile' },
    }, { isAdmin: true });
    expect(screen.getByRole('heading', { name: 'Le Roi Lion' })).toBeInTheDocument();
    expect(screen.getByText('“bambi”')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Next round/ }));
    expect(props.onAdvance).toHaveBeenCalled();
  });

  it('crowns the winner at the end', () => {
    const props = renderGame({
      step: 'done', round: 1, charades, scores: { u1: 10, u2: 18 }, players: { u1: 'Ana', u2: 'Basile' }, winnerId: 'u2', winnerName: 'Basile',
    }, { isAdmin: true });
    expect(screen.getByRole('heading', { name: /Basile/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Start Retro/ }));
    expect(props.onStartRetro).toHaveBeenCalled();
  });
});
