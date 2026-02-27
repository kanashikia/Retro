import express from 'express';
import Session from '../models/Session.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Create a new session with pre-assigned admin
router.post('/create', protect, async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'Missing sessionId' });
    const adminId = req.user.id;

    try {
        const defaultData = {
            id: sessionId,
            phase: 'BRAINSTORM',
            tickets: [],
            themes: [],
            currentThemeIndex: 0,
            adminId: adminId
        };
        const session = await Session.create({
            sessionId,
            adminId,
            data: defaultData
        });
        res.status(201).json(session);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get session history for an admin
router.get('/history/:adminId', protect, async (req, res) => {
    try {
        if (String(req.user.id) !== String(req.params.adminId)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const sessions = await Session.findAll({
            where: {
                adminId: req.params.adminId,
                status: 'closed'
            },
            order: [['updatedAt', 'DESC']]
        });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get actions from the last closed session for an admin
router.get('/last-actions/:adminId/:currentSessionId', protect, async (req, res) => {
    try {
        if (String(req.user.id) !== String(req.params.adminId)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const lastSession = await Session.findOne({
            where: {
                adminId: req.params.adminId,
                status: 'closed',
            },
            order: [['updatedAt', 'DESC']]
        });

        if (!lastSession) {
            return res.json({ actions: [] });
        }

        const sessionData = typeof lastSession.data === 'string'
            ? JSON.parse(lastSession.data)
            : lastSession.data;

        res.json({ actions: sessionData.actions || [] });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
