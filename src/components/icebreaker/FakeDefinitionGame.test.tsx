import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FakeDefinitionGame from './FakeDefinitionGame';
import { RetroPhase } from '../../types';

const ana = { id: 'u1', name: 'Ana', isAdmin: false, votesRemaining: 5 };
const participants = [ana, { id: 'u2', name: 'Basile', isAdmin: false, votesRemaining: 5 }];

const session = (iceBreakerState: any) => ({
  id: 's1', phase: RetroPhase.ICE_BREAKER, tickets: [], themes: [], currentThemeIndex: 0, adminId: 'u1', hasIceBreaker: true,
  iceBreakerState: { game: 'fakedef', questions: [], currentIndex: 0, ...iceBreakerState },
});

const renderGame = (state: any, { isAdmin = false } = {}) => {
  const props = {
    session: session(state) as any, currentUser: ana as any, participants: participants as any, isAdmin, isStarting: false,
    onStart: vi.fn(), onSubmit: vi.fn(), onAdvance: vi.fn(), onSkip: vi.fn(), onStartRetro: vi.fn(), onChangeGame: vi.fn(),
  };
  render(<FakeDefinitionGame {...props} />);
  return props;
};

describe('FakeDefinitionGame', () => {
  it('locks a fake definition', () => {
    const props = renderGame({ step: 'collect', round: 0, words: [{ word: 'Acribie' }], roundStartedAt: Date.now(), submissions: {} });
    expect(screen.getByText('Acribie')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your definition'), { target: { value: 'Maladie du coude' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lock definition' }));
    expect(props.onSubmit).toHaveBeenCalledWith('Maladie du coude', expect.any(Function));
  });

  it('votes for a definition but never for its own', () => {
    const props = renderGame({
      step: 'play', round: 0, words: [{ word: 'Acribie' }], roundStartedAt: Date.now(),
      submissions: { '0': { u1: { text: 'Maladie du coude', at: 1 } } },
      ballots: { '0': [{ text: 'Exactitude minutieuse' }, { text: 'Maladie du coude' }] },
      votes: {},
    });
    expect(screen.getByRole('button', { name: /definition B/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /definition A/ }));
    expect(props.onSubmit).toHaveBeenCalledWith('0', expect.any(Function));
  });

  it('reveals the real definition, the bluffs and who got fooled', () => {
    const props = renderGame({
      step: 'reveal', round: 0, words: [{ word: 'Acribie', definition: 'Exactitude minutieuse' }],
      submissions: { '0': { u1: { text: 'Maladie du coude', at: 1 }, u2: { text: 'Danse bretonne', at: 2 } } },
      ballots: { '0': [{ key: 'real', text: 'Exactitude minutieuse' }, { key: 'u1', text: 'Maladie du coude' }, { key: 'u2', text: 'Danse bretonne' }] },
      votes: { '0': { u1: { index: 0, at: 3 }, u2: { index: 1, at: 4 } } },
      scores: { u1: 3 }, players: { u1: 'Ana', u2: 'Basile' },
    }, { isAdmin: true });
    expect(screen.getByRole('heading', { name: 'Exactitude minutieuse' })).toBeInTheDocument();
    expect(screen.getByText(/by Ana · fooled: Basile/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /See final results/ }));
    expect(props.onAdvance).toHaveBeenCalled();
  });
});
