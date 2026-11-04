import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import JustOneGame from './JustOneGame';
import { RetroPhase } from '../../types';

const ana = { id: 'u1', name: 'Ana', isAdmin: false, votesRemaining: 5 };
const basile = { id: 'u2', name: 'Basile', isAdmin: false, votesRemaining: 5 };
const participants = [ana, basile, { id: 'u3', name: 'Chloé', isAdmin: false, votesRemaining: 5 }];

const session = (iceBreakerState: any) => ({
  id: 's1', phase: RetroPhase.ICE_BREAKER, tickets: [], themes: [], currentThemeIndex: 0, adminId: 'u1', hasIceBreaker: true,
  iceBreakerState: { game: 'justone', questions: [], currentIndex: 0, ...iceBreakerState },
});

const renderGame = (state: any, { isAdmin = false, me = ana } = {}) => {
  const props = {
    session: session(state) as any, currentUser: me as any, participants: participants as any, isAdmin, isStarting: false,
    onStart: vi.fn(), onSubmit: vi.fn(), onAdvance: vi.fn(), onSkip: vi.fn(), onStartRetro: vi.fn(), onChangeGame: vi.fn(),
  };
  render(<JustOneGame {...props} />);
  return props;
};

const rounds = [{ guesserId: 'u1' }, { guesserId: 'u2' }];

describe('JustOneGame', () => {
  it('shows the word to writers and hides it from the guesser while collecting', () => {
    renderGame({ step: 'collect', round: 0, words: [{ word: 'Pirate', guesserId: 'u1' }, rounds[1]], roundStartedAt: Date.now(), submissions: {} }, { me: basile });
    expect(screen.getByText('Pirate')).toBeInTheDocument();
    expect(screen.getByLabelText('Your clue')).toBeInTheDocument();
  });

  it('tells the guesser to look away', () => {
    renderGame({ step: 'collect', round: 0, words: rounds, roundStartedAt: Date.now(), submissions: {} }, { me: ana });
    expect(screen.getByText("You're the guesser")).toBeInTheDocument();
    expect(screen.queryByLabelText('Your clue')).not.toBeInTheDocument();
  });

  it('locks a one-word clue', () => {
    const props = renderGame({ step: 'collect', round: 0, words: [{ word: 'Pirate', guesserId: 'u1' }], roundStartedAt: Date.now(), submissions: {} }, { me: basile });
    fireEvent.change(screen.getByLabelText('Your clue'), { target: { value: 'Capitaine' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lock clue' }));
    expect(props.onSubmit).toHaveBeenCalledWith('Capitaine', expect.any(Function));
  });

  it('lets the guesser answer from the surviving clues only', () => {
    const props = renderGame({
      step: 'play', round: 0, words: rounds, roundStartedAt: Date.now(),
      submissions: { '0': { u2: { text: 'Capitaine', kept: true, at: 1 }, u3: { kept: false, at: 2 } } },
    }, { me: ana });
    expect(screen.getByText('Capitaine')).toBeInTheDocument();
    expect(screen.getByText(/burned/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your guess'), { target: { value: 'pirate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guess' }));
    expect(props.onSubmit).toHaveBeenCalledWith('pirate', expect.any(Function));
  });

  it('reveals the word, the guess and the burned clues', () => {
    const props = renderGame({
      step: 'reveal', round: 0, words: [{ word: 'Pirate', guesserId: 'u1' }, rounds[1]],
      submissions: { '0': { u2: { text: 'Capitaine', kept: true, at: 1 }, u3: { text: 'Piraterie', kept: false, reason: 'word', at: 2 } } },
      guesses: { '0': { text: 'pirate', correct: true, at: 3 } }, scores: { u1: 1, u2: 1 }, teamScore: 1,
      players: { u1: 'Ana', u2: 'Basile', u3: 'Chloé' },
    }, { isAdmin: true });
    expect(screen.getByRole('heading', { name: 'Pirate' })).toBeInTheDocument();
    expect(screen.getByText(/gave the word away/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Next round/ }));
    expect(props.onAdvance).toHaveBeenCalled();
  });

  it('shows only the team result at the end, no individual ranking', () => {
    renderGame({
      step: 'done', round: 1, teamScore: 2, scores: { u1: 2, u2: 1 }, players: { u1: 'Ana', u2: 'Basile' }, winnerId: 'u1', winnerName: 'Ana',
      words: [{ word: 'Pirate', guesserId: 'u1' }, { word: 'Chocolat', guesserId: 'u2' }],
      guesses: { '0': { text: 'pirate', correct: true, at: 1 }, '1': { text: 'chocolat', correct: true, at: 2 } },
    }, { isAdmin: true });
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Telepathy' })).toBeInTheDocument();
    expect(screen.getByText('Pirate')).toBeInTheDocument();
    expect(screen.queryByText('🏆 Ana')).not.toBeInTheDocument();
    expect(screen.queryByText(/Useful clues/)).not.toBeInTheDocument();
  });
});
