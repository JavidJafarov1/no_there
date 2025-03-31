const express = require('express');
const cors = require('cors');
const app = express();

// CORS configuration for development
const isDevelopment = process.env.NODE_ENV !== 'production';

if (isDevelopment) {
  app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
  }));
} else {
  app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ... rest of the code ... 