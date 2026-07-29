import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GroupingBoard from './GroupingBoard';
import { ColumnType, RetroPhase } from '../types';

const emitMock = vi.fn();
vi.mock('../services/socket', () => ({
  socket: { emit: (...args: any[]) => emitMock(...args) }
}));

describe('GroupingBoard', () => {
  const baseSession = {
    id: 'session-1',
    phase: RetroPhase.GROUPING,
    status: 'open',
    themes: [
      { id: 'theme-1', name: 'Theme A', description: 'desc', votes: 0, voterIds: [] },
      { id: 'theme-2', name: 'Theme B', description: 'desc', votes: 0, voterIds: [] }
    ],
    tickets: [
      {
        id: 'ticket-1',
        text: 'Ticket de test vraiment très long pour dépasser largement une seule ligne dans la colonne',
        column: ColumnType.WELL,
        author: 'User 1',
        authorId: 'user-1',
        votes: 0,
        voterIds: [],
        themeId: 'theme-1'
      }
    ],
    participants: [],
    adminId: 'admin-1',
    currentThemeIndex: 0
  };

  beforeEach(() => {
    emitMock.mockClear();

    class ResizeObserverMock {
      constructor(_: ResizeObserverCallback) {}

      observe(_: Element) {}

      unobserve() {}

      disconnect() {}
    }

    Object.defineProperty(window, 'ResizeObserver', {
      writable: true,
      configurable: true,
      value: ResizeObserverMock
    });

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return 100;
      }
    });

    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        return this.textContent?.includes('vraiment très long') ? 220 : 100;
      }
    });
  });

  it('opens oversized tickets by default', () => {
    render(
      <GroupingBoard
        session={baseSession as any}
        currentUser={{ id: 'admin-1', name: 'Admin', isAdmin: true, votesRemaining: 0 } as any}

        onToggleReaction={vi.fn()}
      />
    );

    const ticketText = screen.getByText(baseSession.tickets[0].text);
    expect(ticketText.className).toContain('whitespace-pre-wrap');
  });

  it('keeps oversized tickets expanded after moving a ticket', async () => {
    const { rerender } = render(
      <GroupingBoard
        session={baseSession as any}
        currentUser={{ id: 'admin-1', name: 'Admin', isAdmin: true, votesRemaining: 0 } as any}

        onToggleReaction={vi.fn()}
      />
    );

    const ticketText = screen.getByText(baseSession.tickets[0].text);
    expect(ticketText.className).toContain('whitespace-pre-wrap');

    rerender(
      <GroupingBoard
        session={{
          ...baseSession,
          tickets: [{ ...baseSession.tickets[0], themeId: 'theme-2' }]
        } as any}
        currentUser={{ id: 'admin-1', name: 'Admin', isAdmin: true, votesRemaining: 0 } as any}

        onToggleReaction={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(baseSession.tickets[0].text).className).toContain('whitespace-pre-wrap');
    });
  });

  it('renders all groups/themes open by default', () => {
    render(
      <GroupingBoard
        session={baseSession as any}
        currentUser={{ id: 'admin-1', name: 'Admin', isAdmin: true, votesRemaining: 0 } as any}

        onToggleReaction={vi.fn()}
      />
    );

    // Theme A has a ticket, and it should be visible since it is open by default
    expect(screen.getByText(baseSession.tickets[0].text)).toBeInTheDocument();

    // Theme B has 0 tickets, and its "Drop here" placeholder should be visible since it is open by default
    expect(screen.getByText('Drop here')).toBeInTheDocument();
  });

  it('moves a ticket to another group without drag and drop', () => {
    render(
      <GroupingBoard
        session={baseSession as any}
        currentUser={{ id: 'admin-1', name: 'Admin', isAdmin: true, votesRemaining: 0 } as any}
        onToggleReaction={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText(`Move "${baseSession.tickets[0].text}" to another group`));

    // The sheet lists every group plus "Unassigned"; picking one emits the move.
    fireEvent.click(screen.getByRole('button', { name: 'Theme B' }));

    expect(emitMock).toHaveBeenCalledWith('grouping:move-ticket', {
      sessionId: 'session-1',
      ticketId: 'ticket-1',
      themeId: 'theme-2'
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not re-emit a move when the current group is picked', () => {
    render(
      <GroupingBoard
        session={baseSession as any}
        currentUser={{ id: 'admin-1', name: 'Admin', isAdmin: true, votesRemaining: 0 } as any}
        onToggleReaction={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText(`Move "${baseSession.tickets[0].text}" to another group`));
    fireEvent.click(screen.getByRole('button', { name: 'Theme A' }));

    expect(emitMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
