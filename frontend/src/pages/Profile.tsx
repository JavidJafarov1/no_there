import {
  Box,
  VStack,
  Heading,
  Text,
  Avatar,
  Badge,
  Divider,
  useColorModeValue,
  Spinner,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user, walletAddress, isLoading } = useAuth();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  if (isLoading) {
    return (
      <Box textAlign="center" p={10}>
        <Spinner size="xl" />
      </Box>
    );
  }

  // This shouldn't happen with ProtectedRoute, but just in case
  if (!user && !walletAddress) {
    return (
      <Box p={4}>
        <Text>Please connect your wallet or sign in to view your profile</Text>
      </Box>
    );
  }

  return (
    <Box
      maxW="container.md"
      mx="auto"
      p={6}
      bg={bgColor}
      rounded="xl"
      border="1px"
      borderColor={borderColor}
      shadow="lg"
    >
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Avatar
            size="2xl"
            name={user?.email || walletAddress || 'User'}
          />
          <Heading size="lg" mt={4}>
            {user?.displayName || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'User')}
          </Heading>
          <Badge colorScheme="blue" mt={2}>
            {walletAddress ? 'Wallet Connected' : 'Social Login'}
          </Badge>
        </Box>

        <Divider />

        <Box>
          <Heading size="md" mb={4}>
            Account Details
          </Heading>
          <VStack align="start" spacing={2}>
            {user?.email && (
              <Box>
                <Text fontWeight="bold">Email:</Text>
                <Text>{user.email}</Text>
              </Box>
            )}
            {walletAddress && (
              <Box>
                <Text fontWeight="bold">Wallet Address:</Text>
                <Text fontFamily="monospace">{walletAddress}</Text>
              </Box>
            )}
            {user?.uid && (
              <Box>
                <Text fontWeight="bold">User ID:</Text>
                <Text>{user.uid}</Text>
              </Box>
            )}
            {user?.providerData?.[0]?.providerId && (
              <Box>
                <Text fontWeight="bold">Login Provider:</Text>
                <Text>{user.providerData[0].providerId}</Text>
              </Box>
            )}
          </VStack>
        </Box>

        <Divider />

        <Box>
          <Heading size="md" mb={4}>
            Game Statistics
          </Heading>
          <VStack align="start" spacing={2}>
            <Box>
              <Text fontWeight="bold">Games Played:</Text>
              <Text>0</Text>
            </Box>
            <Box>
              <Text fontWeight="bold">Wins:</Text>
              <Text>0</Text>
            </Box>
            <Box>
              <Text fontWeight="bold">Losses:</Text>
              <Text>0</Text>
            </Box>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default Profile; 