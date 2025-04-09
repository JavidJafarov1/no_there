import {
  Box,
  VStack,
  Heading,
  Text,
  Avatar,
  Badge,
  Divider,
  Spinner,
  Flex,
  Button,
  Container,
  SimpleGrid,
  Icon,
  HStack,
} from "@chakra-ui/react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { FaUser, FaWallet, FaGamepad, FaTwitter } from "react-icons/fa";

/**
 * User profile page
 */
const Profile = () => {
  const { user, walletAddress, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Container maxW="container.sm" py={8} centerContent>
        <Box textAlign="center" p={10}>
          <Spinner size="xl" />
        </Box>
      </Container>
    );
  }

  // This shouldn't happen with ProtectedRoute, but just in case
  if (!user && !walletAddress) {
    return (
      <Container maxW="container.sm" py={8}>
        <Box
          w="100%"
          p={6}
          borderRadius="md"
          bg="white"
          boxShadow="md"
          textAlign="center"
        >
          <Text>
            Please connect your wallet or sign in to view your profile
          </Text>
          <Button
            as={Link}
            to="/login"
            mt={4}
            bg="black"
            color="white"
            _hover={{ bg: "gray.800" }}
          >
            Go to Login
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.sm" py={8}>
      <Box w="100%" p={6} borderRadius="md" bg="white" boxShadow="md">
        <VStack spacing={8} align="stretch">
          <Box textAlign="center">
            <Avatar
              size="2xl"
              name={user?.email || walletAddress || "User"}
              mb={4}
              bg="blue.500"
            />
            <Heading size="lg" fontWeight="bold">
              {user?.displayName ||
                (walletAddress
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : "User")}
            </Heading>
            <Badge colorScheme="blue" mt={2} px={2} py={1} borderRadius="md">
              {walletAddress ? "Wallet Connected" : "Social Login"}
            </Badge>
          </Box>

          <Divider />

          <Box>
            <HStack spacing={2} mb={4}>
              <Icon as={FaUser} color="blue.500" />
              <Heading size="md">Account Details</Heading>
            </HStack>
            <SimpleGrid columns={{ base: 1 }} spacing={4}>
              {user?.email && (
                <Box p={3} borderRadius="md" bg="gray.50">
                  <Text fontWeight="bold" color="gray.700">
                    Email:
                  </Text>
                  <Text>{user.email}</Text>
                </Box>
              )}
              {walletAddress && (
                <Box p={3} borderRadius="md" bg="gray.50">
                  <Text fontWeight="bold" color="gray.700">
                    Wallet Address:
                  </Text>
                  <Text fontSize="sm" fontFamily="monospace">
                    {walletAddress}
                  </Text>
                </Box>
              )}
              {user?.uid && (
                <Box p={3} borderRadius="md" bg="gray.50">
                  <Text fontWeight="bold" color="gray.700">
                    User ID:
                  </Text>
                  <Text fontSize="sm">{user.uid}</Text>
                </Box>
              )}
              {user?.providerData?.[0]?.providerId && (
                <Box p={3} borderRadius="md" bg="gray.50">
                  <Text fontWeight="bold" color="gray.700">
                    Login Provider:
                  </Text>
                  <Text>{user.providerData[0].providerId}</Text>
                </Box>
              )}
            </SimpleGrid>
          </Box>

          <Divider />

          <Box>
            <HStack spacing={2} mb={4}>
              <Icon as={FaTwitter} color="blue.500" />
              <Heading size="md">Social Accounts</Heading>
            </HStack>
            <Box p={5} borderRadius="md" bg="gray.50" textAlign="center">
              <Text mb={4} color="gray.600">
                Connect your social accounts to verify your identity on the
                platform.
              </Text>
              <Button
                as={Link}
                to="/connect-social"
                bg="black"
                color="white"
                height="50px"
                fontWeight="medium"
                w="100%"
                _hover={{ bg: "gray.800" }}
              >
                Connect Social Accounts
              </Button>
            </Box>
          </Box>

          <Divider />

          <Box>
            <HStack spacing={2} mb={4}>
              <Icon as={FaGamepad} color="blue.500" />
              <Heading size="md">Game Statistics</Heading>
            </HStack>
            <SimpleGrid columns={3} spacing={4}>
              <Box p={4} borderRadius="md" bg="gray.50" textAlign="center">
                <Text fontWeight="bold" color="gray.700">
                  Games Played
                </Text>
                <Heading size="xl" mt={2} color="blue.500">
                  0
                </Heading>
              </Box>
              <Box p={4} borderRadius="md" bg="gray.50" textAlign="center">
                <Text fontWeight="bold" color="gray.700">
                  Wins
                </Text>
                <Heading size="xl" mt={2} color="green.500">
                  0
                </Heading>
              </Box>
              <Box p={4} borderRadius="md" bg="gray.50" textAlign="center">
                <Text fontWeight="bold" color="gray.700">
                  Losses
                </Text>
                <Heading size="xl" mt={2} color="red.500">
                  0
                </Heading>
              </Box>
            </SimpleGrid>
          </Box>
        </VStack>
      </Box>
    </Container>
  );
};

export default Profile;
