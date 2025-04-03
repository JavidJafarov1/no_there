// New file for socket service
class SocketService {
  constructor(io, logger) {
    this.io = io;
    this.logger = logger;
    this.connectedUsers = new Map();
  }

  handleConnection(socket) {
    this.logger.info(`Client connected: ${socket.id}`);

    socket.on('authenticate', this.handleAuthentication.bind(this, socket));
    socket.on('userMovement', this.handleUserMovement.bind(this, socket));
    socket.on('disconnect', this.handleDisconnect.bind(this, socket));
  }

  async handleAuthentication(socket, data) {
    try {
      const user = await this.authenticateUser(data);
      if (user) {
        this.connectedUsers.set(socket.id, user);
        socket.user = user;
        socket.emit('authenticated', { success: true, user });
      } else {
        socket.emit('authenticated', { success: false, error: 'Authentication failed' });
      }
    } catch (error) {
      this.logger.error('Authentication error:', error);
      socket.emit('authenticated', { success: false, error: error.message });
    }
  }

  handleUserMovement(socket, data) {
    if (!socket.user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    this.io.emit('userMoved', {
      userId: socket.user.id,
      ...data
    });
  }

  handleDisconnect(socket) {
    this.logger.info(`Client disconnected: ${socket.id}`);
    if (socket.user) {
      this.io.emit('userLeft', { userId: socket.user.id });
      this.connectedUsers.delete(socket.id);
    }
  }

  async authenticateUser(data) {
    // Implementation of user authentication logic
    // This could use Firebase, wallet signatures, or both
    return null;
  }
}

module.exports = SocketService; 