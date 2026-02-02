import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

const Session = sequelize.define('Session', {
    sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    adminId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    data: {
        type: DataTypes.JSON,
        defaultValue: {},
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'active',
    },
}, {
    timestamps: true,
});

export default Session;
