import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Button,
  VStack,
  Text,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
  Icon,
  Divider,
} from "@chakra-ui/react";
import { FaWallet, FaGoogle, FaTwitter } from "react-icons/fa";

/**
 * Component for wallet connection and social authentication
 */
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
    authError,
  } = useAuth();

  const toast = useToast();

  /**
   * Handles wallet connection request
   */
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      toast({
        title: "Wallet connected",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      // Handle the ConnectorNotFoundError specifically
      if (
        error instanceof Error &&
        error.message.includes("Connector not found")
      ) {
        toast({
          title: "Wallet Connection Failed",
          description:
            "MetaMask extension not found. Please install MetaMask or use another login method.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
      // Other errors are handled in AuthContext
    }
  };

  /**
   * Handles Google sign in
   */
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast({
        title: "Signed in with Google",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      // Error is already handled in AuthContext
    }
  };

  /**
   * Handles Twitter sign in
   */
  const handleTwitterSignIn = async () => {
    try {
      await signInWithTwitter();
      toast({
        title: "Signed in with Twitter",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      // Error is already handled in AuthContext
    }
  };

  /**
   * Handles user sign out
   */
  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        status: "success",
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
      <VStack spacing={4} align="stretch">
        <Box p={4} borderRadius="md" bg="gray.50">
          <VStack spacing={4} align="stretch">
            <Text fontWeight="bold" textAlign="center">
              You are signed in
            </Text>

            {walletAddress && (
              <Text fontSize="sm" textAlign="center">
                Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </Text>
            )}

            {user && (
              <Text fontSize="sm" textAlign="center">
                Email: {user.email || "No email"}
              </Text>
            )}
          </VStack>
        </Box>

        <Button
          height="50px"
          bg="black"
          color="white"
          _hover={{ bg: "gray.800" }}
          fontWeight="medium"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </VStack>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {authError && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}

      <Button
        height="60px"
        variant="outline"
        borderWidth="1px"
        borderRadius="lg"
        borderColor="gray.200"
        justifyContent="flex-start"
        bg="white"
        _hover={{ bg: "gray.50" }}
        onClick={handleConnectWallet}
        isLoading={isLoading}
        leftIcon={<Icon as={FaWallet} color="#1652F0" boxSize={6} mr={2} />}
      >
        <Text fontWeight="medium">Connect Wallet</Text>
      </Button>

      <Divider my={2} />

      <Text fontSize="sm" fontWeight="medium" textAlign="center" my={1}>
        Or sign in with
      </Text>

      <Button
        height="60px"
        variant="outline"
        borderWidth="1px"
        borderRadius="lg"
        borderColor="gray.200"
        justifyContent="flex-start"
        bg="white"
        _hover={{ bg: "gray.50" }}
        onClick={handleGoogleSignIn}
        isLoading={isLoading}
        leftIcon={<Icon as={FaGoogle} color="#DB4437" boxSize={6} mr={2} />}
      >
        <Text fontWeight="medium">Sign in with Google</Text>
      </Button>

      <Button
        height="60px"
        variant="outline"
        borderWidth="1px"
        borderRadius="lg"
        borderColor="gray.200"
        justifyContent="flex-start"
        bg="white"
        _hover={{ bg: "gray.50" }}
        onClick={handleTwitterSignIn}
        isLoading={isLoading}
        leftIcon={<Icon as={FaTwitter} color="#1DA1F2" boxSize={6} mr={2} />}
      >
        <Text fontWeight="medium">Sign in with Twitter</Text>
      </Button>

      <Text fontSize="xs" color="gray.500" textAlign="center" mt={2}>
        Note: You'll need to set up WalletConnect and Firebase in the .env file
        for authentication to work properly.
      </Text>
    </VStack>
  );
}
