import express from 'express';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import * as dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../services/emailService.js';

// Simple in-memory rate limiter for auth routes
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 5; // 5 requests per window

const rateLimiter = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (record && now < record.expiry) {
        if (record.count >= MAX_REQUESTS) {
            return res.status(429).json({ message: 'Too many requests, please try again later.' });
        }
        record.count++;
    } else {
        requestCounts.set(ip, { count: 1, expiry: now + RATE_LIMIT_WINDOW });
    }
    next();
};

dotenv.config();

const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const userExists = await User.findOne({ where: { username } });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            username,
            email,
            password,
        });

        if (user) {
            res.status(201).json({
                id: user.id,
                username: user.username,
                token: generateToken(user.id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ where: { username } });

        if (user && (await user.comparePassword(password))) {
            res.json({
                id: user.id,
                username: user.username,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/forgot-password', rateLimiter, async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            // Security: Prevent User Enumeration
            return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link.' });
        }

        // Generate token
        const resetToken = crypto.randomBytes(32).toString('hex');
        // Hash token for database storage
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save();

        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        const message = `
            <h1>Password Reset Request</h1>
            <p>You have requested a password reset</p>
            <p>Please go to this link to reset your password:</p>
            <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
            <p>This link will expire in 15 minutes.</p>
        `;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Password Reset Request',
                text: `Click here to reset your password: ${resetUrl}`,
                html: message,
            });

            res.status(200).json({ message: 'If your email is registered, you will receive a password reset link.' });
        } catch (emailError) {
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();
            console.error("Email send failure", emailError);
            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/reset-password/:token', rateLimiter, async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    // Hash incoming token to compare with DB
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    try {
        const user = await User.findOne({
            where: {
                resetPasswordToken,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        user.password = password; // Hook will hash this
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate current tokens
        await user.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
