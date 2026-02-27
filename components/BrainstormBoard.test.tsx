import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BrainstormBoard from './BrainstormBoard';
import { ColumnType, RetroPhase } from '../types';

describe('BrainstormBoard', () => {
    const mockSession = {
        id: 'session-1',
        title: 'Sprint Retro',
        phase: RetroPhase.BRAINSTORM,
        status: 'open',
        tickets: [
            { id: 't1', authorId: 'user1', author: 'User 1', text: 'My secret idea', column: ColumnType.WELL, votes: 0, voterIds: [] },
            { id: 't2', authorId: 'user2', author: 'User 2', text: 'Other secret', column: ColumnType.WELL, votes: 0, voterIds: [] }
        ],
        participants: [],
        themes: [],
        adminId: 'admin1'
    };

    const participants = [
        { id: 'user1', name: 'User 1', isAdmin: false, isReady: false },
        { id: 'user2', name: 'User 2', isAdmin: false, isReady: false },
        { id: 'admin1', name: 'Admin', isAdmin: true, isReady: false }
    ];

    it('shows only own tickets to a participant', () => {
        const currentUser = { id: 'user1', name: 'User 1', isAdmin: false };
        render(
            <BrainstormBoard
                session={mockSession as any}
                currentUser={currentUser as any}
                participants={participants as any}
                onUpdateSession={vi.fn()}
                onToggleReady={vi.fn()}
            />
        );

        expect(screen.getByText('My secret idea')).toBeDefined();
        expect(screen.queryByText('Other secret')).toBeNull();
    });

    it('shows all tickets to an admin', () => {
        const adminUser = { id: 'admin1', name: 'Admin', isAdmin: true };
        render(
            <BrainstormBoard
                session={mockSession as any}
                currentUser={adminUser as any}
                participants={participants as any}
                onUpdateSession={vi.fn()}
                onToggleReady={vi.fn()}
            />
        );

        expect(screen.getByText('My secret idea')).toBeDefined();
        expect(screen.getByText('Other secret')).toBeDefined();
    });

    it('allows admin to start timer', () => {
        const adminUser = { id: 'admin1', name: 'Admin', isAdmin: true };
        const onUpdateSession = vi.fn();
        render(
            <BrainstormBoard
                session={mockSession as any}
                currentUser={adminUser as any}
                participants={participants as any}
                onUpdateSession={onUpdateSession}
                onToggleReady={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText('Start Timer'));
        expect(onUpdateSession).toHaveBeenCalled();
    });

    it('allows participant to toggle ready status', () => {
        const currentUser = { id: 'user1', name: 'User 1', isAdmin: false };
        const onToggleReady = vi.fn();
        render(
            <BrainstormBoard
                session={mockSession as any}
                currentUser={currentUser as any}
                participants={participants as any}
                onUpdateSession={vi.fn()}
                onToggleReady={onToggleReady}
            />
        );

        fireEvent.click(screen.getByText("I'm done"));
        expect(onToggleReady).toHaveBeenCalledWith(true);
    });
});
