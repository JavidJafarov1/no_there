const cors = require("cors");
const helmet = require("helmet");
const express = require("express");

const setupMiddleware = (app) => {
  // Security middleware
  app.use(helmet());

  // Configure CORS with multiple origins
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? [process.env.FRONTEND_URL]
      : [
          "http://localhost:3000",
          "http://localhost:5000",
          "http://localhost:5173",
        ];

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
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
};

module.exports = {
  setupMiddleware,
};
