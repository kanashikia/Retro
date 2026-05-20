import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Socket } from 'socket.io-client';
import { groupTicketsWithAI } from './geminiService';
import { ColumnType, type Ticket } from '../types';

const makeTicket = (id: string): Ticket => ({
  id,
  text: `Ticket ${id}`,
  column: ColumnType.WELL,
  author: 'Alice',
  votes: 0,
  voterIds: [],
});

describe('groupTicketsWithAI', () => {
  const tickets = [makeTicket('t1'), makeTicket('t2')];
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to a single default theme when the AI response is missing or errored', async () => {
    const emit = vi.fn((_event, _payload, callback) => {
      callback({ error: 'service unavailable' });
    });
    const socket = { emit } as unknown as Socket;

    const result = await groupTicketsWithAI(socket, 'session-1', tickets);

    expect(emit).toHaveBeenCalledWith(
      'ai-group-tickets',
      { sessionId: 'session-1', tickets },
      expect.any(Function)
    );
    expect(result).toEqual({
      themes: [
        {
          id: 'misc',
          name: 'General Topics',
          description: 'Consolidated team feedback for review',
          votes: 0,
          voterIds: [],
        },
      ],
      ticketAssignments: {
        t1: 'misc',
        t2: 'misc',
      },
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('AI Grouping failed:', 'service unavailable');
  });

  it('formats valid AI themes and remaps missing or invalid assignments to the first theme', async () => {
    const emit = vi.fn((_event, _payload, callback) => {
      callback({
        data: {
          themes: [
            { id: 12, name: 'Delivery', description: 'Shipping blockers' },
            { id: 'ops', name: undefined, description: undefined },
            { id: '   ', name: 'Ignored theme' },
          ],
          assignments: [
            { ticketId: 't1', themeId: 'unknown-theme' },
          ],
        },
      });
    });
    const socket = { emit } as unknown as Socket;

    const result = await groupTicketsWithAI(socket, 'session-2', tickets);

    expect(result).toEqual({
      themes: [
        {
          id: '12',
          name: 'Delivery',
          description: 'Shipping blockers',
          votes: 0,
          voterIds: [],
        },
        {
          id: 'ops',
          name: 'Untitled Group',
          description: '',
          votes: 0,
          voterIds: [],
        },
      ],
      ticketAssignments: {
        t1: '12',
        t2: '12',
      },
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[AI-Client] Grouping complete. 2 themes. Assignments: 0 hits, 2 misses (fallback to 12)'
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[AI-Client] Mapping Miss Sample. Ticket ID:',
      't1',
      'Assignment:',
      '12'
    );
  });

  it('falls back when the AI response has no usable themes', async () => {
    const emit = vi.fn((_event, _payload, callback) => {
      callback({
        data: {
          themes: [{ id: null, name: 'Broken' }],
          assignments: [{ ticketId: 't1', themeId: 'broken' }],
        },
      });
    });
    const socket = { emit } as unknown as Socket;

    const result = await groupTicketsWithAI(socket, 'session-3', tickets);

    expect(result).toEqual({
      themes: [
        {
          id: 'misc',
          name: 'General Topics',
          description: 'Consolidated team feedback for review',
          votes: 0,
          voterIds: [],
        },
      ],
      ticketAssignments: {
        t1: 'misc',
        t2: 'misc',
      },
    });
  });
});
