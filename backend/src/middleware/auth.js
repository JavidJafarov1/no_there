const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: 'https://auth.privy.io/api/v1/apps/cm8pvsjsw01vszityct40r9w3/jwks.json'
});

const verifyToken = async (token) => {
  try {
    const decodedToken = jwt.decode(token, { complete: true });
    if (!decodedToken) {
      throw new Error('Invalid token');
    }

    const key = await client.getSigningKey(decodedToken.header.kid);
    const signingKey = key.getPublicKey();

    const verified = jwt.verify(token, signingKey, {
      issuer: 'https://auth.privy.io',
      audience: 'cm8pvsjsw01vszityct40r9w3'
    });

    return verified;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const verifiedToken = await verifyToken(token);

    if (!verifiedToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Add user info to request
    req.user = verifiedToken;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = {
  authMiddleware,
  verifyToken
}; 