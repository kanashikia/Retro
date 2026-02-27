import { describe, it, expect, vi } from 'vitest';
import * as helper from './sessionHelper';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken');

describe('sessionHelper', () => {
    describe('sanitizeUser', () => {
        it('should sanitize user object and ensure name and id', () => {
            const rawUser = { id: ' 123 ', name: '  Alice  ', unknown: 'bla' };
            const sanitized = helper.sanitizeUser(rawUser);
            expect(sanitized).toEqual({
                id: '123',
                name: 'Alice',
                isAdmin: false,
                isReady: false
            });
        });

        it('should fallback to Anonymous if name is missing', () => {
            const rawUser = { id: '123' };
            const sanitized = helper.sanitizeUser(rawUser);
            expect(sanitized.name).toBe('Anonymous');
        });
    });

    describe('isSessionAdmin', () => {
        it('should return true if user is global admin', () => {
            const session = { adminId: '999' };
            const user = { id: '123', isAdmin: true };
            expect(helper.isSessionAdmin(session, user)).toBe(true);
        });

        it('should return true if user is session creator', () => {
            const session = { adminId: '123' };
            const user = { id: '123', isAdmin: false };
            expect(helper.isSessionAdmin(session, user)).toBe(true);
        });

        it('should return false if neither', () => {
            const session = { adminId: '999' };
            const user = { id: '123', isAdmin: false };
            expect(helper.isSessionAdmin(session, user)).toBe(false);
        });
    });

    describe('getVisibleTicketsForUser', () => {
        const sessionData = {
            phase: 'BRAINSTORM',
            adminId: 'admin1',
            tickets: [
                { id: 't1', authorId: 'user1', text: 'My ticket' },
                { id: 't2', authorId: 'user2', text: 'Other ticket' }
            ]
        };

        it('should only show own tickets to a participant in BRAINSTORM phase', () => {
            const user = { id: 'user1', isAdmin: false };
            const visible = helper.getVisibleTicketsForUser(sessionData, user);
            expect(visible.length).toBe(1);
            expect(visible[0].id).toBe('t1');
        });

        it('should show all tickets to admin in BRAINSTORM phase', () => {
            const admin = { id: 'admin1', isAdmin: true };
            const visible = helper.getVisibleTicketsForUser(sessionData, admin);
            expect(visible.length).toBe(2);
        });

        it('should show all tickets to everyone in other phases', () => {
            const groupingSession = { ...sessionData, phase: 'GROUPING' };
            const user = { id: 'user1', isAdmin: false };
            const visible = helper.getVisibleTicketsForUser(groupingSession, user);
            expect(visible.length).toBe(2);
        });
    });

    describe('verifyAdminTokenForUser', () => {
        it('should return false if token is missing', () => {
            expect(helper.verifyAdminTokenForUser(null, '123')).toBe(false);
        });

        it('should return true if jwt.verify returns matching id', () => {
            vi.mocked(jwt.verify).mockReturnValue({ id: '123' });
            expect(helper.verifyAdminTokenForUser('good-token', '123')).toBe(true);
        });

        it('should return false if jwt.verify returns different id', () => {
            vi.mocked(jwt.verify).mockReturnValue({ id: '999' });
            expect(helper.verifyAdminTokenForUser('token', '123')).toBe(false);
        });

        it('should return false if jwt.verify throws', () => {
            vi.mocked(jwt.verify).mockImplementation(() => { throw new Error('fail'); });
            expect(helper.verifyAdminTokenForUser('bad-token', '123')).toBe(false);
        });
    });

    describe('applyParticipantVotingUpdate', () => {
        it('should add a vote to a theme if user has votes left', () => {
            process.env.MAX_VOTES_PER_USER = '5';
            const existingData = {
                themes: [
                    { id: 'theme1', votes: 1, voterIds: ['other_user'] }
                ]
            };
            const incomingData = {
                themes: [
                    { id: 'theme1', voterIds: ['user1'] }
                ]
            };
            const result = helper.applyParticipantVotingUpdate(existingData, incomingData, 'user1');
            expect(result.themes[0].votes).toBe(2);
            expect(result.themes[0].voterIds).toContain('user1');
        });

        it('should reject vote if user reached max votes', () => {
            process.env.MAX_VOTES_PER_USER = '1';
            const existingData = {
                themes: [
                    { id: 'theme1', votes: 1, voterIds: ['user1'] }
                ]
            };
            const incomingData = {
                themes: [
                    { id: 'theme1', voterIds: ['user1', 'user1'] } // trying to add another
                ]
            };
            const result = helper.applyParticipantVotingUpdate(existingData, incomingData, 'user1');
            expect(result.themes[0].votes).toBe(1); // Not increased
        });
    });

    describe('calculateFallbackAssignments', () => {
        const themes = [
            { id: 't1', name: 'Performance', description: 'Speed and latency' },
            { id: 't2', name: 'UI/UX', description: 'Design and layout' }
        ];

        it('should assign tickets based on keyword matches', () => {
            const tickets = [
                { id: 'tick1', text: 'The latency is too high when loading' },
                { id: 'tick2', text: 'Improve the layout of the dashboard' }
            ];
            const result = helper.calculateFallbackAssignments(tickets, themes, new Set());
            expect(result).toContainEqual({ ticketId: 'tick1', themeId: 't1' });
            expect(result).toContainEqual({ ticketId: 'tick2', themeId: 't2' });
        });

        it('should handle stop words and case sensitivity', () => {
            const tickets = [{ id: 'tick1', text: 'PERFORMANCE is great' }];
            const result = helper.calculateFallbackAssignments(tickets, themes, new Set());
            expect(result[0].themeId).toBe('t1');
        });

        it('should default to first theme if no matches', () => {
            const tickets = [{ id: 'tick1', text: 'Something totally unrelated' }];
            const result = helper.calculateFallbackAssignments(tickets, themes, new Set());
            expect(result[0].themeId).toBe('t1');
        });

        it('should skip tickets that are already assigned', () => {
            const tickets = [{ id: 'tick1', text: 'Performance' }];
            const assigned = new Set(['tick1']);
            const result = helper.calculateFallbackAssignments(tickets, themes, assigned);
            expect(result.length).toBe(0);
        });
    });
});
