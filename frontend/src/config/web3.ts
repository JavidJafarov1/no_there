import { createConfig, configureChains } from 'wagmi';
import { mainnet, polygon } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';

// Check if WalletConnect Project ID is available
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const isWalletConnectConfigured = walletConnectProjectId && walletConnectProjectId !== 'YOUR_WALLETCONNECT_PROJECT_ID' && walletConnectProjectId !== 'YOUR_PROJECT_ID';

// Configure chains & providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, polygon],
  [publicProvider()]
);

// Create connectors array
const connectors = [
  new MetaMaskConnector({ chains }),
];

// Only add WalletConnect if project ID is configured
if (isWalletConnectConfigured) {
  connectors.push(
    new WalletConnectConnector({
      chains,
      options: {
        projectId: walletConnectProjectId,
      },
    })
  );
} else {
  console.warn(
    "WalletConnect is not configured. Only MetaMask connections will work. " +
    "Please set VITE_WALLETCONNECT_PROJECT_ID in your .env file."
  );
}

// Set up wagmi config
export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
}); 