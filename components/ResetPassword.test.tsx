import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useParams } from 'react-router-dom';
import ResetPassword from './ResetPassword';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    KeyRound: () => <div data-testid="icon-key" />,
    CheckCircle2: () => <div data-testid="icon-check" />
}));

// Mock react-router-dom useParams
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: vi.fn(),
        useNavigate: () => vi.fn()
    };
});

const renderWithRouter = (ui) => {
    return render(ui, { wrapper: BrowserRouter });
};

describe('ResetPassword component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
        vi.mocked(useParams).mockReturnValue({ token: 'test-token' });
    });

    it('renders the reset password form', () => {
        renderWithRouter(<ResetPassword />);
        expect(screen.getByText('Set New Password')).toBeDefined();
        expect(screen.getAllByPlaceholderText('••••••••')).toHaveLength(2);
    });

    it('shows error if passwords do not match', async () => {
        renderWithRouter(<ResetPassword />);

        fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'pass123' } });
        fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], { target: { value: 'pass456' } });
        fireEvent.click(screen.getByText('Reset Password'));

        expect(screen.getByText("Passwords don't match")).toBeDefined();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('shows success message on successful reset', async () => {
        renderWithRouter(<ResetPassword />);
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Success' })
        } as any);

        fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'newpass' } });
        fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], { target: { value: 'newpass' } });
        fireEvent.click(screen.getByText('Reset Password'));

        await waitFor(() => {
            expect(screen.getByText(/Password reset successfully/i)).toBeDefined();
        });
    });

    it('shows error if reset fails', async () => {
        renderWithRouter(<ResetPassword />);
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: 'Token expired' })
        } as any);

        fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'newpass' } });
        fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], { target: { value: 'newpass' } });
        fireEvent.click(screen.getByText('Reset Password'));

        await waitFor(() => {
            expect(screen.getByText('Token expired')).toBeDefined();
        });
    });
});
