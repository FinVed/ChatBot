import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import chatbotRouter from './routes/chatbot.js';
import sequelize from './db/db.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Production-ready middleware
const allowedOrigins = [
  'http://localhost:5173',          // Standard Vite React local framework default
  'http://localhost:3000',          // Alternative local port fallback
];

// Define your Vercel regex safely at the top level
const vercelRegex = /\.vercel\.app$/;

app.use(cors({
  origin: function (origin, callback) {
    // Allow server-to-server requests or tools like Postman (which send undefined origins)
    if (!origin) return callback(null, true);
    
    // 1. Check strict array inclusions
    const isAllowed = allowedOrigins.some(pattern => pattern === origin);

    // 2. Check dynamic vercel domain matching
    if (isAllowed || vercelRegex.test(origin)) {
      return callback(null, true);
    } else {
      console.error(`Blocked by production safety boundary: CORS violation for origin: ${origin}`);
      return callback(new Error('Not allowed by secure CORS configuration environment constraints.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); 

// 🌟 ADDED: A root path handler to instantly resolve the 404 error
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    message: "🤖 Smart Chatbot Engine is online and operational!" 
  });
});

// Mount our structured AI chatbot feature router
app.use(chatbotRouter);

async function testConnection() {
  try {
      await sequelize.authenticate();
      await sequelize.sync({ alter: true });
      console.log('Database connection has been established successfully.');
  } catch (error) {
      console.error('Unable to connect to the database:', error);
  }
}
testConnection();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 Smart Chatbot Engine initialized on port ${PORT}`);
});