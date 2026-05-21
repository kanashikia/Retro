import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VotingBoard from './VotingBoard';
import { RetroPhase } from '../types';

const emitMock = vi.fn();
vi.mock('../services/socket', () => ({
    socket: { emit: (...args: any[]) => emitMock(...args) }
}));

describe('VotingBoard', () => {
    const mockSession = {
        id: 'session-1',
        title: 'Sprint Retro',
        phase: RetroPhase.VOTING,
        status: 'open',
        themes: [
            { id: 'theme1', name: 'Performance', description: '...', votes: 1, voterIds: ['user1'] }
        ],
        tickets: [
            { id: 't1', themeId: 'theme1', text: 'Slow loading', column: 'WELL', author: 'U1', authorId: 'user1' }
        ],
        participants: [],
        adminId: 'admin1'
    };

    const participants = [
        { id: 'user1', name: 'User 1', isAdmin: false, isReady: false },
        { id: 'admin1', name: 'Admin', isAdmin: true, isReady: false }
    ];

    it('displays remaining votes', () => {
        const currentUser = { id: 'user1', name: 'User 1', isAdmin: false, votesRemaining: 3 };
        render(
            <VotingBoard
                session={mockSession as any}
                currentUser={currentUser as any}
                participants={participants as any}
                onUpdateUser={vi.fn()}
                onToggleReaction={vi.fn()}
            />
        );

        expect(screen.getByText('3 votes left')).toBeDefined();
    });

    it('emits add-vote and calls onUpdateUser when voting', () => {
        const currentUser = { id: 'user1', name: 'User 1', isAdmin: false, votesRemaining: 3 };
        const onUpdateUser = vi.fn();
        emitMock.mockClear();

        render(
            <VotingBoard
                session={mockSession as any}
                currentUser={currentUser as any}
                participants={participants as any}
                onUpdateUser={onUpdateUser}
                onToggleReaction={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText('Vote'));

        expect(emitMock).toHaveBeenCalledWith('voting:add-vote', { sessionId: 'session-1', themeId: 'theme1' });
        expect(onUpdateUser).toHaveBeenCalledWith(expect.objectContaining({ votesRemaining: 2 }));
    });

    it('emits remove-vote and calls onUpdateUser when removing a vote', () => {
        const currentUser = { id: 'user1', name: 'User 1', isAdmin: false, votesRemaining: 3 };
        const onUpdateUser = vi.fn();
        emitMock.mockClear();

        render(
            <VotingBoard
                session={mockSession as any}
                currentUser={currentUser as any}
                participants={participants as any}
                onUpdateUser={onUpdateUser}
                onToggleReaction={vi.fn()}
            />
        );

        const removeButton = screen.getByTitle('Remove a vote');
        fireEvent.click(removeButton);

        expect(emitMock).toHaveBeenCalledWith('voting:remove-vote', { sessionId: 'session-1', themeId: 'theme1' });
        expect(onUpdateUser).toHaveBeenCalledWith(expect.objectContaining({ votesRemaining: 4 }));
    });

    it('disables vote button when 0 votes left', () => {
        const currentUser = { id: 'user1', name: 'User 1', isAdmin: false, votesRemaining: 0 };
        render(
            <VotingBoard
                session={mockSession as any}
                currentUser={currentUser as any}
                participants={participants as any}
                onUpdateUser={vi.fn()}
                onToggleReaction={vi.fn()}
            />
        );

        const button = screen.getByText('Vote').closest('button');
        expect(button?.disabled).toBe(true);
    });

    it('shows participant status to admin', () => {
        const adminUser = { id: 'admin1', name: 'Admin', isAdmin: true, votesRemaining: 5 };
        render(
            <VotingBoard
                session={mockSession as any}
                currentUser={adminUser as any}
                participants={participants as any}
                onUpdateUser={vi.fn()}
                onToggleReaction={vi.fn()}
            />
        );

        expect(screen.getByText('Voting Status')).toBeDefined();
        expect(screen.getByText('User 1')).toBeDefined();
    });
});
