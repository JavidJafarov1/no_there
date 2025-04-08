import { useState } from "react";
import {
  Box,
  VStack,
  Text,
  Button,
  Flex,
  Icon,
  useToast,
  Heading,
  Container,
} from "@chakra-ui/react";
import { FaTwitter } from "react-icons/fa";
import { SiTiktok } from "react-icons/si";
import { useNavigate } from "react-router-dom";
import { socialAccountApi, SocialAccount } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

/**
 * Social platform configuration
 */
const PLATFORMS = {
  twitter: {
    name: "Twitter",
    icon: FaTwitter,
    color: "#1DA1F2",
  },
  farcaster: {
    name: "Farcaster",
    icon: ({ color, size }: { color?: string; size?: number }) => (
      <svg
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M11.01 3.15L2.53 7.9C2.52 7.9 2.51 7.91 2.5 7.91C1.43 8.45 1.43 15.54 2.5 16.09C2.51 16.09 2.52 16.1 2.53 16.1L11.01 20.85C11.01 20.85 11.03 20.85 11.03 20.86C11.63 21.15 21.59 21.13 21.61 16.16C21.61 16.14 21.62 16.12 21.62 16.1L11.03 3.15C11.03 3.15 11.02 3.15 11.01 3.15Z"
          fill={color || "#7A3AF3"}
        />
      </svg>
    ),
    color: "#7A3AF3",
  },
  tiktok: {
    name: "TikTok",
    icon: SiTiktok,
    color: "#000000",
  },
};

type PlatformKey = keyof typeof PLATFORMS;

/**
 * Page for connecting social media accounts
 */
const ConnectSocial = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<Record<PlatformKey, boolean>>({
    twitter: false,
    farcaster: false,
    tiktok: false,
  });
  const toast = useToast();
  const navigate = useNavigate();

  /**
   * Initiates verification process for a social account
   */
  const handleVerify = async (platform: PlatformKey) => {
    try {
      setLoading({ ...loading, [platform]: true });
      await socialAccountApi.startVerification(platform);

      // In a real implementation, this would redirect to OAuth flow
      // For demo purposes, we'll simulate a successful verification
      await simulateSuccessfulVerification(platform);

      toast({
        title: "Success",
        description: `${PLATFORMS[platform].name} account connected successfully!`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to verify ${platform}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading({ ...loading, [platform]: false });
    }
  };

  /**
   * Simulates a successful verification (for demo purposes)
   */
  const simulateSuccessfulVerification = async (platform: PlatformKey) => {
    // This would normally be provided by the OAuth callback
    const mockData = {
      twitter: {
        platformUserId: "twitter123",
        username: "twitterUser",
        profileUrl: "https://twitter.com/user",
      },
      farcaster: {
        platformUserId: "farcaster456",
        username: "farcasterUser",
        profileUrl: "https://farcaster.xyz/user",
      },
      tiktok: {
        platformUserId: "tiktok789",
        username: "tiktokUser",
        profileUrl: "https://tiktok.com/@user",
      },
    };

    const { platformUserId, username, profileUrl } = mockData[platform];

    await socialAccountApi.confirmVerification(
      platform,
      platformUserId,
      username,
      profileUrl
    );
  };

  /**
   * Handles the finish button click
   */
  const handleFinish = () => {
    navigate("/profile");
  };

  return (
    <Container maxW="container.sm" py={8}>
      <Box w="100%" p={6} borderRadius="md" bg="white" boxShadow="md">
        <VStack spacing={8} align="stretch">
          <Box textAlign="center">
            <Heading size="lg" fontWeight="bold" mb={4}>
              Connect your social accounts
            </Heading>
            <Text fontSize="md" color="gray.600">
              Verified social accounts appear on your public profile and let
              users verify who you are. To complete your profile, please connect
              at least one (1) social account.
            </Text>
          </Box>

          <VStack spacing={4} align="stretch">
            {(Object.keys(PLATFORMS) as PlatformKey[]).map((platform) => {
              const { name, icon, color } = PLATFORMS[platform];

              return (
                <Button
                  key={platform}
                  height="60px"
                  variant="outline"
                  borderWidth="1px"
                  borderRadius="lg"
                  borderColor="gray.200"
                  justifyContent="flex-start"
                  bg="white"
                  _hover={{ bg: "gray.50" }}
                  isLoading={loading[platform]}
                  onClick={() => handleVerify(platform)}
                  leftIcon={<Icon as={icon} color={color} boxSize={6} mr={2} />}
                >
                  <Text fontWeight="medium">Verify {name}</Text>
                </Button>
              );
            })}
          </VStack>

          <Flex justify="center" mt={4}>
            <Button
              bg="black"
              color="white"
              size="md"
              fontWeight="medium"
              w="100%"
              _hover={{ bg: "gray.800" }}
              onClick={handleFinish}
            >
              Finish
            </Button>
          </Flex>
        </VStack>
      </Box>
    </Container>
  );
};

export default ConnectSocial;
