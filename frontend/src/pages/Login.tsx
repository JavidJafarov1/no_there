import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Link,
} from "@chakra-ui/react";
import WalletConnect from "../components/WalletConnect";
import { useAuth } from "../contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Get the redirect path from location state, or default to '/profile'
  const from = (location.state as any)?.from?.pathname || "/profile";

  // If user is already authenticated, redirect to the intended page
  if (isAuthenticated && !isLoading) {
    return <Navigate to={from} replace />;
  }

  // Check if environment variables are set
  const isFirebaseConfigured =
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_API_KEY !== "YOUR_FIREBASE_API_KEY";

  const isWalletConnectConfigured =
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID &&
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID !==
      "YOUR_WALLETCONNECT_PROJECT_ID" &&
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID !== "YOUR_PROJECT_ID";

  return (
    <Container maxW="container.sm" py={8}>
      <Box w="100%" p={6} borderRadius="md" bg="white" boxShadow="md">
        <VStack spacing={8} align="stretch">
          <Box textAlign="center">
            <Heading size="lg" fontWeight="bold" mb={4}>
              Login
            </Heading>
            <Text fontSize="md" color="gray.600">
              Connect your wallet or sign in with a social account to access
              your profile and play games.
            </Text>
          </Box>

          {(!isFirebaseConfigured || !isWalletConnectConfigured) && (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>Configuration Required</AlertTitle>
                <AlertDescription>
                  <VStack align="start" spacing={2} mt={2}>
                    {!isFirebaseConfigured && (
                      <Text>
                        Firebase is not configured. Social logins will not work.
                        Please set up Firebase in your .env file.
                      </Text>
                    )}
                    {!isWalletConnectConfigured && (
                      <Text>
                        WalletConnect is not configured. Only MetaMask
                        connections will work. Please set up WalletConnect in
                        your .env file.
                      </Text>
                    )}
                    <Text>
                      Check the project{" "}
                      <Link
                        color="blue.500"
                        href="https://github.com/yourusername/your-repo/blob/main/README.md"
                        isExternal
                      >
                        README
                      </Link>{" "}
                      for setup instructions.
                    </Text>
                  </VStack>
                </AlertDescription>
              </Box>
            </Alert>
          )}

          <Box w="full">
            <WalletConnect />
          </Box>
        </VStack>
      </Box>
    </Container>
  );
}
