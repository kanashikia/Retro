import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'retro',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false,
    }
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
    const maxAttempts = Number(process.env.DB_CONNECT_RETRIES || 20);
    const retryDelayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 2000);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await sequelize.authenticate();
            console.log('MySQL Connection has been established successfully.');
            await sequelize.sync({ alter: true });
            console.log('Database synced.');
            return;
        } catch (error) {
            const isLastAttempt = attempt === maxAttempts;
            console.error(
                `MySQL connection attempt ${attempt}/${maxAttempts} failed:`,
                error?.message || error
            );

            if (isLastAttempt) {
                console.error('Unable to connect to the MySQL database after retries.');
                console.error('Please ensure MySQL is running and the database exists.');
                return;
            }

            await sleep(retryDelayMs);
        }
    }
};

export { sequelize, connectDB };
