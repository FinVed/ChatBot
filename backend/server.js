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
  /\.vercel\.app$/                  // ⚡ SECURE REGEX MATCH: Permits any Vercel domain you deploy to
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow server-to-server requests or tools like Postman (which send undefined origins)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') return pattern === origin;
      return pattern.test(origin); // Test Vercel regex pattern matching
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error(`Blocked by production safety boundary: CORS violation for origin: ${origin}`);
      callback(new Error('Not allowed by secure CORS configuration environment constraints.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Give our JSON parser extra breathing room for image payloads later

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

app.listen(PORT, () => {
  console.log(`🤖 Smart Chatbot Engine initialized on http://localhost:${PORT}`);
});