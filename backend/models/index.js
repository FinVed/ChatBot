// models/index.js
import { Sequelize, DataTypes } from 'sequelize';

// 1. INITIALIZE SEQUELIZE INSTANCE
const sequelize = new Sequelize('demo', 'root', 'Password', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

// 2. DEFINE YOUR EXISTING USER MODEL (Matching your live schema parameters)
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'Users', // Directs Sequelize to look exactly at your existing table name
  timestamps: true    // Tracks your existing createdAt and updatedAt datetime flags
});

// 3. DEFINE CONVERSATION MODEL
const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  }
});

// 4. DEFINE MESSAGE MODEL
const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant'),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT('long'), // Comfortably handles raw text, long code snippets, or heavy base64 strings
    allowNull: false,
  },
}, {
  timestamps: true,
});

const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileContent: {
      type: DataTypes.TEXT('long'), // Comfortably stores entire technical PDFs, Markdown files, or text readouts
      allowNull: false
    }
  }, {
    tableName: 'Documents',
    timestamps: true
  });

// 5. DEFINE RELATIONSHIPS (The Production Chain)
// User has many Conversations -> Conversation belongs to User
User.hasMany(Conversation, { as: 'conversations', foreignKey: 'userId', onDelete: 'CASCADE' });
Conversation.belongsTo(User, { foreignKey: 'userId' });

// Conversation has many Messages -> Message belongs to Conversation
Conversation.hasMany(Message, { as: 'messages', foreignKey: 'conversationId', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

export { sequelize, User, Conversation, Message, Document };