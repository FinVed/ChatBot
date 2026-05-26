import { Sequelize } from 'sequelize';

// Initialize Sequelize with database name, username, password, and configuration options
// const sequelize = new Sequelize('demo', 'root', 'Password', {
//   host: 'localhost',
//   dialect: 'mysql',
//   logging: false // Prevents raw SQL logs from cluttering your terminal console
// });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'demo',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'Password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql'
  }
);

export default sequelize;