import { describe, it, expect, vi, beforeEach } from 'vitest';
import nodemailer from 'nodemailer';
import { sendEmail } from './emailService';

// Mock nodemailer
vi.mock('nodemailer', () => ({
    default: {
        createTransport: vi.fn().mockReturnValue({
            sendMail: vi.fn()
        })
    }
}));

describe('emailService', () => {
    const mockTransporter = nodemailer.createTransport();

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default env vars if needed, though the service uses them directly
        process.env.SMTP_USER = 'test@example.com';
    });

    it('should call sendMail with correct parameters', async () => {
        const payload = {
            to: 'user@example.com',
            subject: 'Test Subject',
            text: 'Hello world',
            html: '<h1>Hello world</h1>'
        };

        vi.mocked(mockTransporter.sendMail).mockResolvedValueOnce({ messageId: '123' });

        const result = await sendEmail(payload);

        expect(mockTransporter.sendMail).toHaveBeenCalledWith({
            from: '"Retro App" <test@example.com>',
            to: payload.to,
            subject: payload.subject,
            text: payload.text,
            html: payload.html
        });
        expect(result).toEqual({ messageId: '123' });
    });

    it('should return null and log error if sendMail fails', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.mocked(mockTransporter.sendMail).mockRejectedValueOnce(new Error('SMTP Error'));

        const result = await sendEmail({ to: 'fail@example.com' });

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('Error sending email:', expect.any(Error));
    });
});
