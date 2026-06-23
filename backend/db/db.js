import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false, 

    // ⚡ CONTROL THE SOCKET POOL: Keeps the connection stable under heavy image payloads
    pool: {
      max: 3,         // Low max pool ensures your single instance doesn't overwhelm MySQL
      min: 0,
      acquire: 60000, // Wait up to 60 seconds to secure a slot before giving up
      idle: 5000
    },
    dialectOptions: {
      connectTimeout: 60000
    }
  }
);

export default sequelize;