const cors = require('cors');
const helmet = require('helmet');
const express = require('express');

const setupMiddleware = (app) => {
  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : "http://localhost:3000",
    credentials: true
  }));

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
  setupMiddleware
}; 