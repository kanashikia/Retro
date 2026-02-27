import { describe, it, expect, vi, beforeEach } from 'vitest';
import { protect } from './auth';
import jwt from 'jsonwebtoken';
import User from '../models/User';

vi.mock('jsonwebtoken');
vi.mock('../models/User');

describe('auth middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
        next = vi.fn();
        vi.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
    });

    it('should return 401 if no authorization header is present', async () => {
        await protect(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
    });

    it('should return 401 if token format is invalid', async () => {
        req.headers.authorization = 'InvalidToken';
        await protect(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should call next() if token is valid and user exists', async () => {
        req.headers.authorization = 'Bearer valid-token';
        vi.mocked(jwt.verify).mockReturnValue({ id: 'user123' });
        vi.mocked(User.findByPk).mockResolvedValue({ id: 'user123', name: 'Alice' });

        await protect(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
        expect(User.findByPk).toHaveBeenCalledWith('user123');
        expect(req.user).toBeDefined();
        expect(next).toHaveBeenCalled();
    });

    it('should return 401 if user does not exist in DB', async () => {
        req.headers.authorization = 'Bearer valid-token';
        vi.mocked(jwt.verify).mockReturnValue({ id: 'missing' });
        vi.mocked(User.findByPk).mockResolvedValue(null);

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, user not found' });
    });

    it('should return 401 if token verification fails', async () => {
        req.headers.authorization = 'Bearer bad-token';
        vi.mocked(jwt.verify).mockImplementation(() => { throw new Error('JWT failed'); });

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, token failed' });
    });
});
