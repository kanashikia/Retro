import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import IceBreakerBoard from './IceBreakerBoard';
import { RetroPhase } from '../types';

const baseSession = {
  id: 'session-1',
  phase: RetroPhase.ICE_BREAKER,
  tickets: [],
  themes: [],
  currentThemeIndex: 0,
  adminId: 'admin1',
  hasIceBreaker: true,
};

const participants = [
  { id: 'u1', name: 'Ana', isAdmin: false, votesRemaining: 5 },
  { id: 'u2', name: 'Basile', isAdmin: false, votesRemaining: 5 },
];

const renderBoard = (session: any, isAdmin: boolean, overrides: Partial<React.ComponentProps<typeof IceBreakerBoard>> = {}) => {
  const props = {
    session,
    currentUser: participants[0] as any,
    participants: participants as any,
    isAdmin,
    isGenerating: false,
    onGenerate: vi.fn(),
    onNext: vi.fn(),
    onStartRetro: vi.fn(),
    onSelectGame: vi.fn(),
    onChangeGame: vi.fn(),
    isStarting: false,
    onStart: vi.fn(),
    onSubmit: vi.fn(),
    onAdvance: vi.fn(), onSkip: vi.fn(), onSetExcludedGames: vi.fn(),
    ...overrides,
  };
  render(<IceBreakerBoard {...props} />);
  return props;
};

describe('IceBreakerBoard', () => {
  it('shows the game picker to the admin when no game is selected', () => {
    const props = renderBoard(baseSession, true);
    expect(screen.getByText('Game time')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Question Roulette' }));
    expect(props.onSelectGame).toHaveBeenCalledWith('questions');

    // Picking locks the cards until the server confirms.
    fireEvent.click(screen.getByRole('button', { name: 'Random game' }));
    expect(props.onSelectGame).toHaveBeenCalledTimes(1);
  });

  it('opens the wheel screen on Random, then spins from there', () => {
    const props = renderBoard(baseSession, true);
    fireEvent.click(screen.getByRole('button', { name: 'Random game' }));
    expect(props.onSelectGame).not.toHaveBeenCalled();
    expect(screen.getByText("Who's in?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Spin the wheel' }));
    expect(props.onSelectGame).toHaveBeenCalledWith('random');
  });

  it('keeps participants from picking a game', () => {
    const props = renderBoard(baseSession, false);
    expect(screen.getByText(/The admin is picking a game/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Random game' }));
    expect(props.onSelectGame).not.toHaveBeenCalled();
  });

  it('offers every game to the admin', () => {
    renderBoard(baseSession, true);
    for (const name of ['Question Roulette', 'Emoji Charades', 'Just One', 'Would You Rather', 'Fake Definition']) {
      expect(screen.getByRole('button', { name })).toBeEnabled();
    }
  });

  it('benches a game by clicking its slice, and restores it from the bench', () => {
    const props = renderBoard({ ...baseSession, iceBreakerState: { questions: [], currentIndex: 0, game: null, excludedGames: ['wyr'] } }, true);
    fireEvent.click(screen.getByRole('button', { name: 'Random game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Take Emoji Charades out of the wheel' }));
    expect(props.onSetExcludedGames).toHaveBeenCalledWith(['wyr', 'emoji']);
    fireEvent.click(screen.getByRole('button', { name: 'Put Would You Rather back in the wheel' }));
    expect(props.onSetExcludedGames).toHaveBeenCalledWith([]);
  });

  it('asks before leaving a game in progress, and switches on confirm', () => {
    const session = {
      ...baseSession,
      iceBreakerState: { game: 'emoji', step: 'play', round: 0, charades: [{ emojis: '🦁👑🌅' }], roundStartedAt: Date.now(), submissions: {}, questions: [], currentIndex: 0 },
    };
    const props = renderBoard(session, true);
    fireEvent.click(screen.getByRole('button', { name: /Change game/ }));
    expect(props.onChangeGame).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent('Switch game?');
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Change game/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch game' }));
    expect(props.onChangeGame).toHaveBeenCalledTimes(1);
  });

  it('asks before leaving the questions game halfway, not once the last question is shown', () => {
    const questions = [
      { participantId: 'u1', participantName: 'Ana', question: 'Q1 ?' },
      { participantId: 'u2', participantName: 'Basile', question: 'Q2 ?' },
    ];
    const midGame = { ...baseSession, iceBreakerState: { game: 'questions', step: 'play', questions, currentIndex: 0 } };
    const first = renderBoard(midGame, true);
    fireEvent.click(screen.getByRole('button', { name: /Change game/ }));
    expect(first.onChangeGame).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent('Switch game?');
    cleanup();

    const lastQuestion = { ...baseSession, iceBreakerState: { game: 'questions', step: 'play', questions, currentIndex: 1 } };
    const last = renderBoard(lastQuestion, true);
    fireEvent.click(screen.getByRole('button', { name: /Play another game/ }));
    expect(last.onChangeGame).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('switches without asking from a lobby', () => {
    const session = { ...baseSession, iceBreakerState: { game: 'emoji', step: 'lobby', questions: [], currentIndex: 0 } };
    const props = renderBoard(session, true);
    fireEvent.click(screen.getByRole('button', { name: /Change game/ }));
    expect(props.onChangeGame).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the just one lobby once that game is selected', () => {
    const session = { ...baseSession, iceBreakerState: { game: 'justone', step: 'lobby', questions: [], currentIndex: 0 } };
    const props = renderBoard(session, true);
    fireEvent.click(screen.getByRole('button', { name: /Start the game/ }));
    expect(props.onStart).toHaveBeenCalled();
  });

  it('renders the emoji charades lobby once that game is selected', () => {
    const session = { ...baseSession, iceBreakerState: { game: 'emoji', step: 'lobby', questions: [], currentIndex: 0 } };
    const props = renderBoard(session, true);
    fireEvent.click(screen.getByRole('button', { name: /Start the game/ }));
    expect(props.onStart).toHaveBeenCalled();
  });

  it('renders the questions lobby once that game is selected', () => {
    const session = { ...baseSession, iceBreakerState: { game: 'questions', step: 'lobby', questions: [], currentIndex: 0 } };
    const props = renderBoard(session, true);
    expect(screen.getByRole('button', { name: /Generate Questions/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Change game/ }));
    expect(props.onChangeGame).toHaveBeenCalled();
  });

  it('treats a legacy state without a game id as the questions game', () => {
    const session = {
      ...baseSession,
      iceBreakerState: {
        questions: [{ participantId: 'u1', participantName: 'Ana', question: 'Ta madeleine de Proust ?' }],
        currentIndex: 0,
      },
    };
    renderBoard(session, false);
    expect(screen.getByText('Ta madeleine de Proust ?')).toBeInTheDocument();
  });

  it('plays the wheel after a fresh random pick, then shows the game', () => {
    const session = {
      ...baseSession,
      iceBreakerState: { game: 'questions', step: 'lobby', questions: [], currentIndex: 0, spin: { id: 's1', at: Date.now() } },
    };
    renderBoard(session, true);
    expect(screen.getByRole('img', { name: /Spinning game wheel/ })).toBeInTheDocument();
  });

  it('skips the wheel for a stale spin', () => {
    const session = {
      ...baseSession,
      iceBreakerState: { game: 'questions', step: 'lobby', questions: [], currentIndex: 0, spin: { id: 's1', at: Date.now() - 60_000 } },
    };
    renderBoard(session, true);
    expect(screen.queryByRole('img', { name: /Spinning game wheel/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Questions/ })).toBeInTheDocument();
  });
});
