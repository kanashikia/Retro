import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BoardHeader from './BoardHeader';
import { RetroPhase } from '../types';
import { ThemeProvider } from '../context/ThemeContext';

// Mock Lucide icons to avoid rendering complexities in unit tests
vi.mock('lucide-react', () => ({
    LayoutDashboard: () => <div data-testid="icon-dashboard" />,
    Users: () => <div data-testid="icon-users" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    ChevronRight: () => <div data-testid="icon-chevron" />,
    Copy: () => <div data-testid="icon-copy" />,
    LogOut: () => <div data-testid="icon-logout" />,
    Palette: () => <div data-testid="icon-palette" />,
    History: () => <div data-testid="icon-history" />,
    CheckCircle2: () => <div data-testid="icon-check" />,
    AlertCircle: () => <div data-testid="icon-alert" />
}));

// Mock Timer component
vi.mock('./Timer', () => ({
    default: () => <div data-testid="timer">00:00</div>
}));

const mockSession = {
    id: 'session-1',
    phase: RetroPhase.BRAINSTORM,
    tickets: [],
    themes: [],
    currentThemeIndex: 0,
    adminId: 'admin-1'
};

const mockUser = {
    id: 'user-1',
    name: 'Alice',
    isAdmin: false,
    votesRemaining: 5
};

const mockParticipants = [mockUser];

describe('BoardHeader component', () => {
    const defaultProps = {
        session: mockSession,
        currentUser: mockUser,
        participants: mockParticipants,
        isLoading: false,
        error: null,
        onNextPhase: vi.fn(),
        onReset: vi.fn(),
        onUpdateSession: vi.fn()
    };

    const renderWithTheme = (ui) => {
        return render(
            <ThemeProvider>
                {ui}
            </ThemeProvider>
        );
    };

    it('renders the session info and user name', () => {
        renderWithTheme(<BoardHeader {...defaultProps} />);
        expect(screen.getByText('Retro')).toBeDefined();
        expect(screen.getByText('Alice')).toBeDefined();
        expect(screen.getByText('Only you')).toBeDefined();
    });

    it('shows the Admin badge and action button only for admins', () => {
        const adminUser = { ...mockUser, id: 'admin-1', isAdmin: true };
        const { rerender } = renderWithTheme(<BoardHeader {...defaultProps} currentUser={adminUser} />);

        expect(screen.getByText('Admin')).toBeDefined();
        expect(screen.getByText('Group with AI')).toBeDefined();

        // Rerender as normal user
        rerender(<ThemeProvider><BoardHeader {...defaultProps} currentUser={mockUser} /></ThemeProvider>);
        expect(screen.queryByText('Admin')).toBeNull();
        expect(screen.queryByText('Group with AI')).toBeNull();
    });

    it('toggles the theme dropdown on palette click', () => {
        renderWithTheme(<BoardHeader {...defaultProps} />);
        const paletteBtn = screen.getByTitle('Change Theme');

        fireEvent.click(paletteBtn);
        expect(screen.getByText('Select Theme')).toBeDefined();

        fireEvent.click(paletteBtn);
        expect(screen.queryByText('Select Theme')).toBeNull();
    });

    it('calls onNextPhase when the action button is clicked', () => {
        const adminUser = { ...mockUser, id: 'admin-1', isAdmin: true };
        const onNextPhase = vi.fn();
        renderWithTheme(<BoardHeader {...defaultProps} currentUser={adminUser} onNextPhase={onNextPhase} />);

        const nextBtn = screen.getByText('Group with AI');
        fireEvent.click(nextBtn);
        expect(onNextPhase).toHaveBeenCalled();
    });

    it('shows a timer if brainstormTimerEndsAt is present', () => {
        const sessionWithTimer = { ...mockSession, brainstormTimerEndsAt: Date.now() + 60000 };
        renderWithTheme(<BoardHeader {...defaultProps} session={sessionWithTimer} />);
        expect(screen.getByTestId('timer')).toBeDefined();
    });
});
