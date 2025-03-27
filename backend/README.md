# Multiplayer Online Project Backend

A scalable backend for a multiplayer online project featuring WebSocket communication, blockchain integration, and real-time user interactions.

## Features

- Real-time communication using Socket.IO
- Firebase Authentication integration for secure user management
- Ethereum blockchain integration with MetaMask authentication
- PostgreSQL database for persistent storage
- Redis for caching and pub/sub messaging
- AWS-ready deployment configuration
- Secure API endpoints with proper authentication

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- Redis
- Firebase project with Authentication enabled
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

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
```

4. Create the database:
```sql
CREATE DATABASE multiplayer_db;
```

## Firebase Setup

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Authentication and set up the sign-in methods you want to use (Google, Email/Password, etc.)
3. Generate a new private key for service account:
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Download the JSON file
4. Update your `.env` file with the following values from the downloaded JSON:
   - `FIREBASE_PROJECT_ID`: The `project_id` field
   - `FIREBASE_CLIENT_EMAIL`: The `client_email` field
   - `FIREBASE_PRIVATE_KEY`: The `private_key` field (keep the quotes)

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
- `authenticate` - Authenticate user with Firebase token or wallet signature
- `userMovement` - Send user movement data

#### Server to Client
- `authenticated` - Authentication result
- `userMoved` - Broadcast user movement
- `userLeft` - User disconnected notification

## Authentication Methods

The backend supports two authentication methods:

1. **Firebase Authentication**: Users can authenticate using Firebase auth tokens
   - The frontend obtains a token from Firebase Authentication
   - The token is passed to the backend for verification

2. **Wallet Authentication**: Users can authenticate using wallet signatures
   - The backend generates a nonce for the user
   - The user signs the nonce with their wallet
   - The backend verifies the signature

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