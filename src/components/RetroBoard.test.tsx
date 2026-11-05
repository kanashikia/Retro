import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RetroBoard from './RetroBoard';

const io = vi.hoisted(() => {
  const managerHandlers = new Map<string, () => void>();
  return {
    managerHandlers,
    socket: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      io: {
        on: vi.fn((e: string, h: () => void) => managerHandlers.set(e, h)),
        off: vi.fn((e: string) => managerHandlers.delete(e)),
      },
    },
  };
});
vi.mock('../services/socket', () => ({ socket: io.socket }));
vi.mock('../context/ThemeContext', () => ({ useTheme: () => ({ setSessionDefaultThemeId: vi.fn() }) }));

const joins = () => io.socket.emit.mock.calls.filter(([event]) => event === 'join-session');

beforeEach(() => {
  vi.clearAllMocks();
  io.managerHandlers.clear();
  localStorage.clear();
  localStorage.setItem('retro_user_v1', JSON.stringify({ id: 'u1', name: 'Ana' }));
  localStorage.setItem('retro_participant_token_v1', 'token-1');
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) })));
});

const renderBoard = () => render(
  <MemoryRouter initialEntries={['/retro/s1']}>
    <Routes><Route path="/retro/:id" element={<RetroBoard />} /></Routes>
  </MemoryRouter>
);

describe('RetroBoard session join', () => {
  it('joins again after a reconnect, with the latest participant token, and stops on unmount', () => {
    const { unmount } = renderBoard();
    expect(joins()).toHaveLength(1);
    expect(joins()[0][1]).toMatchObject({ sessionId: 's1', user: { id: 'u1', name: 'Ana' }, participantToken: 'token-1' });

    // A server restart or a network drop: the socket reconnects under a new id.
    localStorage.setItem('retro_participant_token_v1', 'token-2');
    io.managerHandlers.get('reconnect')!();
    expect(joins()).toHaveLength(2);
    expect(joins()[1][1]).toMatchObject({ sessionId: 's1', participantToken: 'token-2' });

    unmount();
    expect(io.managerHandlers.has('reconnect')).toBe(false);
  });
});
