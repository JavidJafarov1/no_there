require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const cluster = require("cluster");
const os = require("os");

// Import routes and middleware
const { setupRoutes } = require("./routes");
const { setupMiddleware } = require("./middleware");
const { setupSocketHandlers } = require("./socket");
const { setupDatabase } = require("./config/database");
const { setupLogger } = require("./utils/logger");

// Number of workers to create (use # of CPU cores by default)
const numWorkers = process.env.WORKERS || os.cpus().length;

// Main function for setting up the server
const setupServer = () => {
  const app = express();
  const server = http.createServer(app);

  // Define allowed origins
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? [process.env.FRONTEND_URL]
      : [
          "http://localhost:3000",
          "http://localhost:5000",
          "http://localhost:5173",
        ];

  // Socket.IO with optimized settings for high concurrency
  const io = socketIo(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Socket.IO performance optimizations
    transports: ["websocket"],
    pingInterval: 10000,
    pingTimeout: 5000,
    connectTimeout: 5000,
    maxHttpBufferSize: 1e6, // 1MB
    // Add adapter for Redis if using multiple instances
    ...(process.env.REDIS_HOST && {
      adapter: require("socket.io-redis")({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      }),
    }),
  });

  // Setup logger
  const logger = setupLogger();

  // Setup middleware with security options
  setupMiddleware(app);

  // Add security headers
  app.use(helmet());

  // Configure CORS
  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
          return callback(null, true);
        } else {
          return callback(null, false);
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    })
  );

  // Setup routes
  setupRoutes(app);

  // Setup Socket.IO handlers
  setupSocketHandlers(io);

  // Setup database connection
  setupDatabase().catch((err) => {
    logger.error("Failed to connect to database:", err);
    process.exit(1);
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  });

  const PORT = process.env.PORT || 3001;

  server.listen(PORT, () => {
    logger.info(`Worker ${process.pid} started and listening on port ${PORT}`);
  });

  // Handle graceful shutdown
  const shutdown = () => {
    logger.info(`Worker ${process.pid} shutting down...`);

    // Close server
    server.close(() => {
      logger.info("HTTP server closed");

      // Close database connections
      require("./config/database").pgPool.end();
      require("./config/database").redisClient.quit();
      require("./config/database").redisPublisher.quit();
      require("./config/database").redisSubscriber.quit();

      logger.info("All connections closed");
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error("Forcing shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  // Listen for shutdown signals
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

// Use cluster module to create multiple workers
if (cluster.isMaster && process.env.NODE_ENV === "production") {
  console.log(`Master process ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  // Handle worker exits and restart them
  cluster.on("exit", (worker, code, signal) => {
    console.log(
      `Worker ${worker.process.pid} died with code ${code} and signal ${signal}`
    );
    console.log("Starting a new worker");
    cluster.fork();
  });
} else {
  // Workers share the TCP connection
  setupServer();
}
