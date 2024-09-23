const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize with PostgreSQL configuration
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // You can adjust this based on your SSL requirements
      }
    }
  });

// Define the User model
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    }
});

// Export the Sequelize instance and User model
module.exports = { User, sequelize };
