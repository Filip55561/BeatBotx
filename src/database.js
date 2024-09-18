const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'data.sqlite',
    logging: process.env.NODE_ENV === 'production' ? false : console.log
});

// Define the User model
const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

// Export the Sequelize instance and User model
module.exports = { User, sequelize };
