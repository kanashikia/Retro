import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true, // Initially true to allow existing users without email
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    tokenVersion: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    }
}, {
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
    },
});

User.prototype.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default User;
