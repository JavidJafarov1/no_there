import { useAuth } from '../contexts/AuthContext';
import { Box, Button, VStack, Text, Divider, useToast, Alert, AlertIcon, AlertDescription } from '@chakra-ui/react';

export default function WalletConnect() {
  const { 
    connectWallet, 
    signInWithGoogle, 
    signInWithTwitter, 
    isLoading,
    isAuthenticated,
    walletAddress,
    user,
    signOut,
    authError
  } = useAuth();
  
  const toast = useToast();

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      toast({
        title: 'Wallet connected',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      // Error is already handled in AuthContext
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast({
        title: 'Signed in with Google',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      // Error is already handled in AuthContext
    }
  };

  const handleTwitterSignIn = async () => {
    try {
      await signInWithTwitter();
      toast({
        title: 'Signed in with Twitter',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      // Error is already handled in AuthContext
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Signed out successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      // Error is already handled in AuthContext
    }
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={4}>
        <Text>Loading authentication...</Text>
      </Box>
    );
  }

  if (isAuthenticated) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="md">
        <VStack spacing={4}>
          <Text fontWeight="bold">You are signed in</Text>
          
          {walletAddress && (
            <Text fontSize="sm">
              Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </Text>
          )}
          
          {user && (
            <Text fontSize="sm">
              Email: {user.email || 'No email'}
            </Text>
          )}
          
          <Button colorScheme="red" onClick={handleSignOut}>
            Sign Out
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="md">
      <VStack spacing={4}>
        <Text fontWeight="bold">Connect with</Text>

        {authError && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}
        
        <Button 
          colorScheme="blue" 
          width="full" 
          onClick={handleConnectWallet}
          isLoading={isLoading}
        >
          Connect Wallet
        </Button>
        
        <Divider />
        
        <Button 
          colorScheme="red" 
          width="full" 
          onClick={handleGoogleSignIn}
          isLoading={isLoading}
        >
          Sign in with Google
        </Button>
        
        <Button 
          colorScheme="twitter" 
          width="full" 
          onClick={handleTwitterSignIn}
          isLoading={isLoading}
        >
          Sign in with Twitter
        </Button>

        <Text fontSize="xs" color="gray.500" textAlign="center">
          Note: You'll need to set up Firebase and WalletConnect in the .env file for authentication to work properly.
        </Text>
      </VStack>
    </Box>
  );
} 