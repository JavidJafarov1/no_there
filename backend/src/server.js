const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const http = require("http");
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
const setupSocketIO = require("./config/socketSetup");

// Number of workers to create (use # of CPU cores by default)
const numWorkers = process.env.WORKERS || os.cpus().length;

// Main function for setting up the server
const setupServer = async () => {
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

  // Setup database connection first
  try {
    await setupDatabase();
    logger.info("Database setup completed successfully");

    // Setup Socket.IO with Redis adapter after database is connected
    const io = await setupSocketIO(server);

    // Setup Socket.IO handlers
    setupSocketHandlers(io);
  } catch (error) {
    logger.error("Database setup failed:", error);
    process.exit(1);
  }

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
  setupServer().catch((error) => {
    console.error("Failed to setup server:", error);
    process.exit(1);
  });
}
