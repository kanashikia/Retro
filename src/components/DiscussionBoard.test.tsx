import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DiscussionBoard from './DiscussionBoard';
import { RetroPhase } from '../types';

const emitMock = vi.fn();
vi.mock('../services/socket', () => ({
    socket: { emit: (...args: any[]) => emitMock(...args) }
}));

describe('DiscussionBoard', () => {
    const makeSession = (currentThemeIndex: number) => ({
        id: 'session-1',
        title: 'Sprint Retro',
        phase: RetroPhase.DISCUSSION,
        status: 'open',
        currentThemeIndex,
        themes: [
            { id: 'theme1', name: 'Performance', description: 'Speed issues', votes: 3, voterIds: ['user1'] },
            { id: 'theme2', name: 'Communication', description: 'Team sync', votes: 1, voterIds: ['user1'] }
        ],
        tickets: [
            { id: 't1', themeId: 'theme1', text: 'Slow loading', column: 'WELL', author: 'U1', authorId: 'user1' }
        ],
        actions: [],
        participants: [],
        adminId: 'admin1'
    });

    const participants = [
        { id: 'user1', name: 'User 1', isAdmin: false, isReady: false },
        { id: 'admin1', name: 'Admin', isAdmin: true, isReady: false }
    ];

    const currentUser = { id: 'user1', name: 'User 1', isAdmin: false, votesRemaining: 0 };

    // jsdom implements neither Element.scrollTo nor a real window.scrollTo.
    beforeEach(() => {
        (Element.prototype as any).scrollTo = vi.fn();
        window.scrollTo = vi.fn() as any;
    });

    it('displays the current topic', () => {
        render(
            <DiscussionBoard
                session={makeSession(0) as any}
                currentUser={currentUser as any}
                participants={participants as any}
                onToggleReaction={vi.fn()}
            />
        );

        expect(screen.getByText('Performance')).toBeDefined();
        expect(screen.getByText('Topic 1 of 2')).toBeDefined();
    });

    it('renders the topic nav above the topic header, so it keeps one position across topics', () => {
        const adminUser = { id: 'admin1', name: 'Admin', isAdmin: true, votesRemaining: 0 };
        render(
            <DiscussionBoard
                session={makeSession(0) as any}
                currentUser={adminUser as any}
                participants={participants as any}
                onToggleReaction={vi.fn()}
            />
        );

        const nav = screen.getByRole('button', { name: /next topic/i });
        const title = screen.getByText('Performance');

        // Anything whose height depends on the theme's content must come after the nav.
        expect(nav.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('scrolls back to the top of the page when the topic changes', () => {
        const { rerender } = render(
            <DiscussionBoard
                session={makeSession(0) as any}
                currentUser={currentUser as any}
                participants={participants as any}
                onToggleReaction={vi.fn()}
            />
        );

        (window.scrollTo as any).mockClear();

        rerender(
            <DiscussionBoard
                session={makeSession(1) as any}
                currentUser={currentUser as any}
                participants={participants as any}
                onToggleReaction={vi.fn()}
            />
        );

        expect(screen.getByText('Communication')).toBeDefined();
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });
});
