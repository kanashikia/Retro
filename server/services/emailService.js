import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async ({ to, subject, text, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"Retro App" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        // We log the error but don't throw it to avoid breaking the auth flow if email fails
        // In a strict environment, you might want to handle this differently
        return null;
    }
};
