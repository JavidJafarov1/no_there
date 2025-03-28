# Frontend Authentication System

This project uses Firebase for social login authentication and Wagmi for wallet connections.

## Authentication Configuration

This application requires configuration for authentication to work properly. You'll need to:

1. Set up Firebase for social logins (Google, Twitter)
2. Set up WalletConnect for wallet connections (beyond MetaMask)

## Setup Instructions

### 1. Firebase Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name and follow the setup wizard
4. Once your project is created, click on the Web icon (`</>`) to add a web app
5. Register your app with a nickname (e.g., "my-auth-app")
6. From Project Settings, copy the Firebase configuration values
7. Enable Authentication from the Firebase console sidebar
8. In the Authentication section, go to "Sign-in method" and enable:
   - Google (requires a support email)
   - Twitter (requires Twitter Developer credentials)

### 2. WalletConnect Setup

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create an account if you don't have one
3. Create a new project
4. Copy your Project ID

### 3. Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```env
# Firebase configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# WalletConnect configuration
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

Replace all placeholder values with your actual configuration.

## Troubleshooting

### Firebase Auth Errors

- **Invalid API Key**: Ensure your Firebase API key is correctly copied into the `.env` file
- **Domain not authorized**: You may need to add your domain to the authorized domains list in Firebase console
- **Social Login Failures**: Check that you've properly set up the specific provider in Firebase console

### WalletConnect Errors

- **Project ID errors**: Make sure your WalletConnect Project ID is correctly copied into the `.env` file
- **Connection failures**: Check the browser console for specific error messages
- **MetaMask still works**: MetaMask should still work even if WalletConnect isn't configured properly

## Running the Application

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Access the application at http://localhost:5000

## Authentication Flow

The application uses a unified authentication context that supports both wallet connections and social logins:

1. The `AuthProvider` manages authentication state for both methods
2. The `ProtectedRoute` component guards routes that require authentication
3. The `WalletConnect` component provides UI for all authentication methods

## Components

- `AuthProvider`: Context provider for authentication state
- `WalletConnect`: UI component for connecting wallet and social logins
- `ProtectedRoute`: Higher-order component to protect routes
- `Login`: Page with authentication options

## Usage

To protect a route:
```jsx
<Route
  path="/protected-page"
  element={
    <ProtectedRoute>
      <YourComponent />
    </ProtectedRoute>
  }
/>
```

To use authentication in a component:
```jsx
import { useAuth } from '../contexts/AuthContext';

function YourComponent() {
  const { user, walletAddress, isAuthenticated, signOut } = useAuth();
  
  // Your component logic
}
``` 