import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'demo',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'Password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false, // ⚡ CRUCIAL: Stops Sequelize from printing massive image text blobs in your Railway logs

    // ⚡ FIX 1: Add a connection pool so the database can reuse stable channels
    pool: {
      max: 5,         // Max active connections
      min: 0,         // Min connections kept open
      acquire: 30000, // Max time (ms) to wait for connection before failing
      idle: 10000     // Time (ms) a connection can stay idle before closing
    },

    // ⚡ FIX 2: Give the driver extra connection time to push large strings through
    dialectOptions: {
      connectTimeout: 60000 // 60 seconds connection timeout
    }
  }
);

export default sequelize;