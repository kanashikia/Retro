import express from 'express';
import Session from '../models/Session.js';

const router = express.Router();

// Create a new session with pre-assigned admin
router.post('/create', async (req, res) => {
    const { sessionId, adminId } = req.body;
    if (!sessionId || !adminId) return res.status(400).json({ message: 'Missing data' });

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
router.get('/history/:adminId', async (req, res) => {
    try {
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

export default router;
