# Multiplayer Online Project Backend

A scalable backend for a multiplayer online project featuring WebSocket communication, blockchain integration, and real-time user interactions.

## Features

- Real-time communication using Socket.IO
- Ethereum blockchain integration with MetaMask authentication
- PostgreSQL database for persistent storage
- Redis for caching and pub/sub messaging
- AWS-ready deployment configuration
- Secure API endpoints with proper authentication

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- Redis
- MetaMask (for testing blockchain features)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd multiplayer-online-project
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and configure your environment variables:
```env
PORT=3000
NODE_ENV=development
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=multiplayer_db
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
ETHEREUM_NETWORK=sepolia
ETHEREUM_RPC_URL=your_ethereum_rpc_url
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
```

4. Create the database:
```sql
CREATE DATABASE multiplayer_db;
```

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication
- `GET /api/auth/nonce` - Get nonce for wallet authentication
- `POST /api/auth/verify` - Verify wallet signature

### User
- `GET /api/user/:address` - Get user profile by wallet address

### WebSocket Events

#### Client to Server
- `authenticate` - Authenticate user with wallet signature
- `userMovement` - Send user movement data

#### Server to Client
- `authenticated` - Authentication result
- `userMoved` - Broadcast user movement
- `userLeft` - User disconnected notification

## Project Structure

```
src/
├── config/         # Configuration files
├── middleware/     # Express middleware
├── routes/         # API routes
├── services/       # Business logic
├── socket/         # Socket.IO handlers
├── utils/          # Utility functions
└── server.js       # Main application file
```

## Testing

Run tests:
```bash
npm test
```

## Deployment

The application is configured for deployment on AWS. See the deployment documentation for detailed instructions.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 