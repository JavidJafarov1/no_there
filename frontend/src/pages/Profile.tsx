import {
  Box,
  VStack,
  Heading,
  Text,
  Avatar,
  Badge,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { usePrivy } from '@privy-io/react-auth';

const Profile = () => {
  const { user } = usePrivy();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  if (!user) {
    return (
      <Box p={4}>
        <Text>Please connect your wallet to view your profile</Text>
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
            name={user.email?.address || user.wallet?.address}
          />
          <Heading size="lg" mt={4}>
            {user.email?.address || user.wallet?.address}
          </Heading>
          <Badge colorScheme="blue" mt={2}>
            {user.wallet?.address ? 'Wallet Connected' : 'Email Connected'}
          </Badge>
        </Box>

        <Divider />

        <Box>
          <Heading size="md" mb={4}>
            Account Details
          </Heading>
          <VStack align="start" spacing={2}>
            {user.email?.address && (
              <Box>
                <Text fontWeight="bold">Email:</Text>
                <Text>{user.email.address}</Text>
              </Box>
            )}
            {user.wallet?.address && (
              <Box>
                <Text fontWeight="bold">Wallet Address:</Text>
                <Text fontFamily="monospace">{user.wallet.address}</Text>
              </Box>
            )}
            <Box>
              <Text fontWeight="bold">Account ID:</Text>
              <Text>{user.id}</Text>
            </Box>
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