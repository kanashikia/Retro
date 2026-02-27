import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VotingBoard from './VotingBoard';
import { RetroPhase } from '../types';

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
                onUpdateSession={vi.fn()}
                onUpdateUser={vi.fn()}
                onToggleReaction={vi.fn()}
            />
        );

        expect(screen.getByText('You have 3 votes left')).toBeDefined();
    });

    it('calls onUpdateSession and onUpdateUser when voting', () => {
        const currentUser = { id: 'user1', name: 'User 1', isAdmin: false, votesRemaining: 3 };
        const onUpdateSession = vi.fn();
        const onUpdateUser = vi.fn();

        render(
            <VotingBoard
                session={mockSession as any}
                currentUser={currentUser as any}
                participants={participants as any}
                onUpdateSession={onUpdateSession}
                onUpdateUser={onUpdateUser}
                onToggleReaction={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText('Vote for this group'));

        expect(onUpdateSession).toHaveBeenCalled();
        expect(onUpdateUser).toHaveBeenCalledWith(expect.objectContaining({ votesRemaining: 2 }));
    });

    it('disables vote button when 0 votes left', () => {
        const currentUser = { id: 'user1', name: 'User 1', isAdmin: false, votesRemaining: 0 };
        render(
            <VotingBoard
                session={mockSession as any}
                currentUser={currentUser as any}
                participants={participants as any}
                onUpdateSession={vi.fn()}
                onUpdateUser={vi.fn()}
                onToggleReaction={vi.fn()}
            />
        );

        const button = screen.getByText('Vote for this group').closest('button');
        expect(button?.disabled).toBe(true);
    });

    it('shows participant status to admin', () => {
        const adminUser = { id: 'admin1', name: 'Admin', isAdmin: true, votesRemaining: 5 };
        render(
            <VotingBoard
                session={mockSession as any}
                currentUser={adminUser as any}
                participants={participants as any}
                onUpdateSession={vi.fn()}
                onUpdateUser={vi.fn()}
                onToggleReaction={vi.fn()}
            />
        );

        expect(screen.getByText('Participants Voting Status')).toBeDefined();
        expect(screen.getByText('User 1')).toBeDefined();
    });
});
