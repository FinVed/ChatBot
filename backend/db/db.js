import { Sequelize } from 'sequelize';

// Initialize Sequelize with database name, username, password, and configuration options
const sequelize = new Sequelize('demo', 'root', 'Password', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false // Prevents raw SQL logs from cluttering your terminal console
});

export default sequelize;