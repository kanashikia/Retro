import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ForgotPassword from './ForgotPassword';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Mail: () => <div data-testid="icon-mail" />,
    ArrowLeft: () => <div data-testid="icon-arrow-left" />,
    CheckCircle2: () => <div data-testid="icon-check" />
}));

const renderWithRouter = (ui) => {
    return render(ui, { wrapper: BrowserRouter });
};

describe('ForgotPassword component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('renders the forgot password form', () => {
        renderWithRouter(<ForgotPassword />);
        expect(screen.getByText('Reset Password')).toBeDefined();
        expect(screen.getByPlaceholderText('your@email.com')).toBeDefined();
    });

    it('shows success message on successful submit', async () => {
        renderWithRouter(<ForgotPassword />);
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: async () => ({ message: 'Email sent successfully' })
        } as any);

        fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByText('Send Reset Link'));

        await waitFor(() => {
            expect(screen.getByText('Email sent successfully')).toBeDefined();
        });
    });

    it('shows error if email sending fails', async () => {
        renderWithRouter(<ForgotPassword />);
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            status: 429,
            headers: new Map([['content-type', 'application/json']]),
            json: async () => ({ message: 'Too many requests' })
        } as any);

        fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByText('Send Reset Link'));

        await waitFor(() => {
            expect(screen.getByText('Too many requests')).toBeDefined();
        });
    });

    it('disables the button during loading', async () => {
        renderWithRouter(<ForgotPassword />);
        // Return a promise that doesn't resolve immediately
        let resolveFetch: (val: any) => void;
        const fetchPromise = new Promise(resolve => { resolveFetch = resolve; });
        vi.mocked(fetch).mockReturnValue(fetchPromise as any);

        fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByText('Send Reset Link'));

        expect(screen.getByText('Sending...')).toBeDefined();
        expect(screen.getByRole('button')).toHaveProperty('disabled', true);
    });
});
