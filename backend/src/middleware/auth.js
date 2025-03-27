const admin = require('firebase-admin');
const { verifyWalletSignature } = require('../services/blockchain');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

/**
 * Verify a Firebase ID token
 * @param {string} token - The Firebase ID token to verify
 * @returns {Promise<object|null>} - The decoded token or null if invalid
 */
const verifyFirebaseToken = async (token) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return null;
  }
};

/**
 * Verify a wallet signature
 * @param {string} signature - The signature to verify
 * @param {string} message - The original message that was signed
 * @param {string} address - The wallet address that should have signed the message
 * @returns {Promise<boolean>} - Whether the signature is valid
 */
const verifyWalletAuth = async (signature, message, address) => {
  try {
    return await verifyWalletSignature(signature, message, address);
  } catch (error) {
    console.error('Wallet signature verification failed:', error);
    return false;
  }
};

/**
 * Middleware to authenticate requests using Firebase token or wallet signature
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await verifyFirebaseToken(token);

    if (!decodedToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Add user info to request
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to authenticate requests using wallet signature
 * Expects signature, message, and address in the request body
 */
const walletAuthMiddleware = async (req, res, next) => {
  try {
    const { signature, message, address } = req.body;
    
    if (!signature || !message || !address) {
      return res.status(400).json({ error: 'Missing signature parameters' });
    }

    const isValid = await verifyWalletAuth(signature, message, address);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid wallet signature' });
    }

    // Add user info to request
    req.user = { address };
    next();
  } catch (error) {
    console.error('Wallet auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = {
  authMiddleware,
  walletAuthMiddleware,
  verifyFirebaseToken,
  verifyWalletAuth
}; 