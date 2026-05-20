import { describe, expect, it } from 'vitest';
import { ColumnType, RetroPhase, SessionState } from '../types';
import { buildSessionExportLines, buildSessionPdf } from './sessionExport';

const session: SessionState = {
  id: 'retro-1',
  phase: RetroPhase.DISCUSSION,
  adminId: 'admin-1',
  createdAt: '2026-05-03T08:30:00.000Z',
  currentThemeIndex: 0,
  tickets: [
    {
      id: 'ticket-1',
      text: 'Ship faster <script>alert("x")</script>',
      column: ColumnType.WELL,
      author: 'Alice',
      authorId: 'user-1',
      votes: 0,
      voterIds: [],
      themeId: 'theme-1'
    },
    {
      id: 'ticket-2',
      text: 'Need clearer specs',
      column: ColumnType.LESS_WELL,
      author: 'Bob',
      authorId: 'user-2',
      votes: 0,
      voterIds: []
    }
  ],
  themes: [
    {
      id: 'theme-1',
      name: 'Delivery',
      description: 'Shipping work',
      votes: 3,
      voterIds: ['user-1', 'user-2', 'user-3']
    }
  ],
  actions: [
    {
      id: 'action-1',
      text: 'Clarify acceptance criteria',
      assigneeId: 'user-2',
      assigneeName: 'Bob'
    }
  ]
};

describe('session export', () => {
  it('builds session content for PDF export', () => {
    const lines = buildSessionExportLines(
      session,
      [
        { id: 'admin-1', name: 'Alice', isAdmin: true, votesRemaining: 5 },
        { id: 'user-2', name: 'Bob', isAdmin: false, votesRemaining: 2 }
      ],
      new Date('2026-05-04T10:00:00Z')
    ).map(line => line.text);

    expect(lines).toContain('Retro session retro-1');
    expect(lines).toContain('Phase: DISCUSSION');
    expect(lines.some(line => line.startsWith('Created '))).toBe(true);
    expect(lines).not.toContain('Participants');
    expect(lines).not.toContain('Alice - Admin, Bob');
    expect(lines).toContain('Delivery (3 votes)');
    expect(lines).toContain('1. Bob: Clarify acceptance criteria');
  });

  it('builds a PDF document without print HTML', () => {
    const pdf = buildSessionPdf(session, [], new Date('2026-05-04T10:00:00Z'));

    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/Type /Catalog');
    expect(pdf).toContain('/Type /Catalog /Pages 3 0 R');
    expect(pdf).toContain('3 0 obj\n<< /Type /Pages');
    expect(pdf).toContain('startxref');
    expect(pdf).not.toContain('FEFF');
    expect(pdf).not.toContain('Participants');
    expect(pdf).not.toContain('<script>alert("x")</script>');
  });
});
