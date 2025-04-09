import {
  Box,
  Flex,
  Button,
  Container,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  HStack,
  Text,
  Icon,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  VStack,
  IconButton,
} from "@chakra-ui/react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEffect } from "react";
import { ChevronDownIcon, HamburgerIcon } from "@chakra-ui/icons";
import { FaHome, FaGamepad, FaUser } from "react-icons/fa";

/**
 * Props for the Layout component
 */
interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Main layout component that wraps all pages
 */
const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isAuthenticated, isLoading, signOut, user, walletAddress } =
    useAuth();

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // If user is on the home page after login, redirect to game
      if (location.pathname === "/") {
        navigate("/game");
      }
    }
  }, [isLoading, isAuthenticated, location.pathname, navigate]);

  // Get the display name for the user menu
  const getDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split("@")[0];
    if (walletAddress)
      return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    return "User";
  };

  /**
   * Navigation items based on authentication state
   */
  const navItems = [
    { name: "Home", path: "/", icon: FaHome, isAlwaysVisible: true },
    { name: "Play", path: "/game", icon: FaGamepad, isAuthRequired: true },
    { name: "Profile", path: "/profile", icon: FaUser, isAuthRequired: true },
  ];

  /**
   * Filtered nav items based on auth state
   */
  const filteredNavItems = navItems.filter(
    (item) => item.isAlwaysVisible || (item.isAuthRequired && isAuthenticated)
  );

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Desktop Navbar */}
      <Box
        as="nav"
        bg="white"
        boxShadow="sm"
        position="sticky"
        top={0}
        zIndex={10}
      >
        <Container maxW="container.xl">
          <Flex h="70px" align="center" gap="8px">
            <Flex align="center" flex={1}>
              <RouterLink to="/">
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  bgGradient="linear(to-r, blue.500, purple.500)"
                  bgClip="text"
                >
                  No There
                </Text>
              </RouterLink>
            </Flex>

            {/* Desktop Navigation */}
            <HStack spacing={2} display={{ base: "none", md: "flex" }}>
              {filteredNavItems.map((item) => (
                <RouterLink to={item.path} key={item.path}>
                  <Button
                    variant="ghost"
                    color={isActive(item.path) ? "blue.500" : "gray.600"}
                    fontWeight={isActive(item.path) ? "bold" : "medium"}
                    _hover={{ bg: "gray.100" }}
                    leftIcon={<Icon as={item.icon} />}
                  >
                    {item.name}
                  </Button>
                </RouterLink>
              ))}
            </HStack>

            {/* Mobile Menu Button */}
            <IconButton
              aria-label="Open menu"
              icon={<HamburgerIcon />}
              variant="ghost"
              display={{ base: "flex", md: "none" }}
              onClick={onOpen}
            />

            {/* Auth Buttons / User Menu */}
            <HStack spacing={4} display={{ base: "none", md: "flex" }}>
              {isAuthenticated ? (
                <Menu>
                  <MenuButton
                    as={Button}
                    rightIcon={<ChevronDownIcon />}
                    bg="white"
                    borderWidth="1px"
                    borderRadius="full"
                    borderColor="gray.200"
                    _hover={{ bg: "gray.50" }}
                  >
                    <Flex align="center">
                      <Avatar
                        size="xs"
                        mr={2}
                        name={getDisplayName()}
                        bg="blue.500"
                      />
                      <Text fontWeight="medium" fontSize="sm">
                        {getDisplayName()}
                      </Text>
                    </Flex>
                  </MenuButton>
                  <MenuList shadow="lg" borderRadius="md">
                    <MenuItem
                      icon={<Icon as={FaUser} />}
                      onClick={() => navigate("/profile")}
                    >
                      Profile
                    </MenuItem>
                    <MenuItem onClick={signOut}>Sign Out</MenuItem>
                  </MenuList>
                </Menu>
              ) : (
                <Button onClick={() => navigate("/login")} colorScheme="blue">
                  Sign In
                </Button>
              )}
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader
            borderBottomWidth="1px"
            bgGradient="linear(to-r, blue.500, purple.500)"
            bgClip="text"
          >
            No There
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch" mt={4}>
              {filteredNavItems.map((item) => (
                <Button
                  key={item.path}
                  leftIcon={<Icon as={item.icon} />}
                  justifyContent="flex-start"
                  variant="ghost"
                  color={isActive(item.path) ? "blue.500" : "gray.600"}
                  fontWeight={isActive(item.path) ? "bold" : "medium"}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                >
                  {item.name}
                </Button>
              ))}
              {!isAuthenticated ? (
                <Button
                  onClick={() => {
                    navigate("/login");
                    onClose();
                  }}
                  bg="black"
                  color="white"
                  _hover={{ bg: "gray.800" }}
                  fontWeight="medium"
                  mt={4}
                >
                  Sign In
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    signOut();
                    onClose();
                  }}
                  colorScheme="red"
                  variant="outline"
                  mt={4}
                >
                  Sign Out
                </Button>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Main Content */}
      <Box bg="gray.50" minH="calc(100vh - 70px)">
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
