import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoCloseOldSessions } from './cleanupService';
import Session from '../models/Session.js';

vi.mock('../models/Session.js');

describe('cleanupService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    it('should call Session.update with correct cutoff date', async () => {
        process.env.SESSION_AUTO_CLOSE_DAYS = '7';
        const now = new Date('2026-02-27T12:00:00Z');
        vi.setSystemTime(now);

        // Expectation: 7 days before Feb 27 is Feb 20
        const expectedCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        vi.mocked(Session.update).mockResolvedValue([5]); // Mock 5 sessions updated

        await autoCloseOldSessions();

        expect(Session.update).toHaveBeenCalled();
        const callArgs = vi.mocked(Session.update).mock.calls[0][1];
        const updatedAtClause = callArgs.where.updatedAt;
        const ltSymbol = Object.getOwnPropertySymbols(updatedAtClause)
            .find(s => s.toString() === 'Symbol(lt)');

        expect(updatedAtClause[ltSymbol].getTime()).toBe(expectedCutoff.getTime());
    });

    it('should use default 7 days if SESSION_AUTO_CLOSE_DAYS is not set', async () => {
        delete process.env.SESSION_AUTO_CLOSE_DAYS;
        const now = new Date('2026-02-27T12:00:00Z');
        vi.setSystemTime(now);
        const expectedCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        vi.mocked(Session.update).mockResolvedValue([0]);

        await autoCloseOldSessions();

        // Verify the cutoff date in the where clause
        const callArgs = vi.mocked(Session.update).mock.calls[0][1];
        const cutoffInCall = callArgs.where.updatedAt;
        // The value of Op.lt key
        const ltValue = Object.getOwnPropertySymbols(cutoffInCall)
            .find(s => s.toString() === 'Symbol(lt)');

        expect(cutoffInCall[ltValue].getTime()).toBe(expectedCutoff.getTime());
    });
});
