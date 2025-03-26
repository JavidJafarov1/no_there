require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

// Import routes and middleware
const { setupRoutes } = require('./routes');
const { setupMiddleware } = require('./middleware');
const { setupSocketHandlers } = require('./socket');
const { setupDatabase } = require('./config/database');
const { setupLogger } = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Setup logger
const logger = setupLogger();

// Setup middleware
setupMiddleware(app);

// Setup routes
setupRoutes(app);

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Setup database connection
setupDatabase().catch(err => {
  logger.error('Failed to connect to database:', err);
  process.exit(1);
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
}); 