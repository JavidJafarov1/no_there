import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner, Center } from '@chakra-ui/react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show loading spinner while authentication state is being determined
  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }
  
  // Redirect to home page if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  // Render children if authenticated
  return <>{children}</>;
} 