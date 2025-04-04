import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  TwitterAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../config/firebase';

// Define the shape of our auth context
interface AuthContextType {
  user: FirebaseUser | null;
  walletAddress: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithTwitter: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component that wraps the app and makes auth object available
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Wagmi hooks for wallet connection
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Check if user is authenticated with either method
  const isAuthenticated = Boolean(address);

  // Listen for Firebase auth state changes
  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setIsLoading(false);
      }, (error) => {
        console.error("Firebase auth error:", error);
        setAuthError("Firebase authentication error. Check your configuration.");
        setIsLoading(false);
      });
      
      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to set up auth listener:", error);
      setAuthError("Failed to initialize authentication. Check your configuration.");
      setIsLoading(false);
      return () => {}; // Empty cleanup function
    }
  }, []);

  // Connect wallet using MetaMask or other connectors
  const connectWallet = async () => {
    setAuthError(null);
    try {
      // Check if we have any connectors
      if (!connectors || connectors.length === 0) {
        throw new Error('No wallet connectors available');
      }
      
      // Use the first available connector (usually MetaMask)
      const connector = connectors[0];
      
      connect({ connector });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setAuthError('Failed to connect wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error;
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    setAuthError(null);
    try {
      disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      setAuthError('Failed to disconnect wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Failed to sign in with Google:', error);
      setAuthError('Failed to sign in with Google: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error;
    }
  };

  // Sign in with Twitter
  const signInWithTwitter = async () => {
    setAuthError(null);
    try {
      const provider = new TwitterAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Failed to sign in with Twitter:', error);
      setAuthError('Failed to sign in with Twitter: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error;
    }
  };

  // Sign out from both Firebase and wallet
  const signOut = async () => {
    setAuthError(null);
    try {
      if (user) await firebaseSignOut(auth);
      if (address) disconnect();
    } catch (error) {
      console.error('Failed to sign out:', error);
      setAuthError('Failed to sign out: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error;
    }
  };

  // Context value
  const value = {
    user,
    walletAddress: address || null,
    isLoading,
    isAuthenticated,
    connectWallet,
    disconnectWallet,
    signInWithGoogle,
    signInWithTwitter,
    signOut,
    authError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 