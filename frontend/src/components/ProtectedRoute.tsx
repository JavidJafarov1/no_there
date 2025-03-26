import { Navigate, useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { verifyPrivyToken } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (authenticated) {
        try {
          const token = await getAccessToken();
          if (token) {
            const payload = await verifyPrivyToken(token);
            if (!payload) {
              // Token verification failed
              setIsVerifying(false);
            }
          }
        } catch (error) {
          console.error('Token verification error:', error);
          setIsVerifying(false);
        }
      } else {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [authenticated, getAccessToken]);

  if (!ready || isVerifying) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    // Redirect to home page but save the attempted location
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 