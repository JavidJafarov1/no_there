#!/bin/bash

# Script to set up Firebase and Wagmi authentication

echo "Installing Firebase and Wagmi dependencies..."

# Install Firebase dependencies
npm install firebase

# Install Wagmi dependencies
npm install wagmi viem @web3modal/wagmi

# Create .env template file
if [ ! -f .env ]; then
    echo "Creating .env template file..."
    cat > .env.template << EOF
# Firebase configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# WalletConnect configuration
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
EOF
    echo ".env.template file created. Rename to .env and add your keys."
else
    echo ".env file already exists. Skipping template creation."
fi

echo "Setup complete! Please follow the README instructions to configure Firebase and WalletConnect." 