import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    LayoutDashboard: () => <div data-testid="icon-dashboard" />,
    LogIn: () => <div data-testid="icon-login" />,
    UserPlus: () => <div data-testid="icon-user-plus" />,
    CheckCircle2: () => <div data-testid="icon-check" />
}));

const renderWithRouter = (ui) => {
    return render(ui, { wrapper: BrowserRouter });
};

describe('Login component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('renders login form by default', () => {
        renderWithRouter(<Login />);
        expect(screen.getByText('Admin Login')).toBeDefined();
        expect(screen.getByPlaceholderText('admin_user')).toBeDefined();
        expect(screen.getByPlaceholderText('••••••••')).toBeDefined();
        expect(screen.queryByPlaceholderText('your@email.com')).toBeNull();
    });

    it('switches to registration form', () => {
        renderWithRouter(<Login />);
        fireEvent.click(screen.getByText('New admin? Create an account'));
        expect(screen.getByText('Create Admin')).toBeDefined();
        expect(screen.getByPlaceholderText('your@email.com')).toBeDefined();
    });

    it('shows error if API call fails', async () => {
        renderWithRouter(<Login />);
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            headers: new Map([['content-type', 'application/json']]),
            json: async () => ({ message: 'Invalid credentials' })
        } as any);

        fireEvent.change(screen.getByPlaceholderText('admin_user'), { target: { value: 'test' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
        fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeDefined();
        });
    });

    it('handles successful login', async () => {
        const navigateMock = vi.fn();
        // Note: useNavigate mock is complex in vitest if not careful, 
        // but we can check if localStorage is updated.
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

        renderWithRouter(<Login />);
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: async () => ({ token: 'mock-token', id: '1', username: 'alice' })
        } as any);

        fireEvent.change(screen.getByPlaceholderText('admin_user'), { target: { value: 'alice' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password' } });
        fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

        await waitFor(() => {
            expect(setItemSpy).toHaveBeenCalledWith('retro_token', 'mock-token');
        });
    });

    it('requires fields to be filled (native validation check)', () => {
        renderWithRouter(<Login />);
        const usernameInput = screen.getByPlaceholderText('admin_user') as HTMLInputElement;
        const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;

        expect(usernameInput.required).toBe(true);
        expect(passwordInput.required).toBe(true);
    });
});
