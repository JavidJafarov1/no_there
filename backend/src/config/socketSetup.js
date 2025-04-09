const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { SOCKET_CONFIG } = require("./constants");
const { redisClient, redisPublisher, redisSubscriber } = require("./database");

/**
 * Creates and configures a Socket.IO server with Redis adapter
 * @param {import('http').Server} httpServer - HTTP server instance
 * @returns {import('socket.io').Server} Configured Socket.IO server instance
 */
const setupSocketIO = async (httpServer) => {
  const io = new Server(httpServer, SOCKET_CONFIG);

  // Ensure Redis clients are connected
  if (!redisPublisher.isOpen) {
    await redisPublisher.connect();
  }

  if (!redisSubscriber.isOpen) {
    await redisSubscriber.connect();
  }

  // Use existing publisher and subscriber clients
  io.adapter(createAdapter(redisPublisher, redisSubscriber));

  return io;
};

module.exports = setupSocketIO;
