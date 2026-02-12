import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const protect = async (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findByPk(decoded.id);
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, user not found' });
        }
        return next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

export { protect };
