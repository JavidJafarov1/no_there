const { verifyWalletSignature } = require('../services/blockchain');
const { verifyFirebaseToken } = require('../middleware/auth');

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected');

    // Handle user authentication with Firebase token
    socket.on('authenticate', async (data) => {
      try {
        // Check if using token or wallet signature
        if (data.token) {
          // Firebase token authentication
          const decodedToken = await verifyFirebaseToken(data.token);
          
          if (decodedToken) {
            socket.user = decodedToken;
            socket.userAddress = decodedToken.wallet_address || decodedToken.uid; // Use wallet if available, otherwise uid
            socket.emit('authenticated', { success: true, user: decodedToken });
          } else {
            socket.emit('authenticated', { success: false, error: 'Invalid token' });
          }
        } else if (data.signature && data.message && data.address) {
          // Wallet signature authentication
          const { signature, message, address } = data;
          const isValid = await verifyWalletSignature(signature, message, address);
          
          if (isValid) {
            socket.userAddress = address;
            socket.user = { address };
            socket.emit('authenticated', { success: true, user: { address } });
          } else {
            socket.emit('authenticated', { success: false, error: 'Invalid signature' });
          }
        } else {
          socket.emit('authenticated', { success: false, error: 'Invalid authentication data' });
        }
      } catch (error) {
        console.error('Socket authentication error:', error);
        socket.emit('authenticated', { success: false, error: error.message });
      }
    });

    // Handle user movement
    socket.on('userMovement', (data) => {
      if (!socket.user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Broadcast movement to all other clients
      socket.broadcast.emit('userMoved', {
        address: socket.userAddress,
        ...data
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected');
      if (socket.userAddress) {
        io.emit('userLeft', { address: socket.userAddress });
      }
    });
  });
};

module.exports = {
  setupSocketHandlers
}; 