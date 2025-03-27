// Remove or comment out Privy-specific functions like verifyPrivyToken

import { User } from 'firebase/auth';

/**
 * Get the authentication token for the current user
 * @param user Firebase user object
 * @returns Promise with the ID token
 */
export const getAuthToken = async (user: User): Promise<string | null> => {
  if (!user) return null;

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Add authorization headers to a fetch request
 * @param headers Headers object to add authorization to
 * @param token Auth token
 */
export const addAuthHeaders = (headers = {}, token: string | null): HeadersInit => {
  if (!token) return headers;
  
  return {
    ...headers,
    'Authorization': `Bearer ${token}`
  };
};

/**
 * Create an authenticated fetch function that automatically adds auth headers
 * @param token Auth token
 * @returns Fetch function with auth headers
 */
export const createAuthFetch = (token: string | null) => {
  return async (url: string, options: RequestInit = {}) => {
    const headers = addAuthHeaders(options.headers, token);
    return fetch(url, { ...options, headers });
  };
}; 