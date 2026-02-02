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

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL Connection has been established successfully.');
        // Sync models
        await sequelize.sync();
        console.log('Database synced.');
    } catch (error) {
        console.error('Unable to connect to the MySQL database:', error);
        console.error('Please ensure MySQL is running and the database exists.');
        // Don't exit process here so developer can see the error in logs while server tries to start
    }
};

export { sequelize, connectDB };
