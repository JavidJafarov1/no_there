import axios from "axios";
import { auth } from "../config/firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to add authorization header
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error adding auth token to request:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface ApiError {
  error: string;
}

interface VerificationRequest {
  accountId: string;
  verificationToken: string;
}

interface VerificationConfirm {
  success: boolean;
  accountId: string;
}

interface SocialAccount {
  id: string;
  platform: string;
  platform_user_id: string;
  username: string;
  profile_url: string;
  verified: boolean;
  verification_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * API service for handling social account operations
 */
const socialAccountApi = {
  /**
   * Gets all social accounts for the current user
   */
  getAccounts: async (): Promise<SocialAccount[]> => {
    try {
      const response = await apiClient.get<SocialAccount[]>(
        `/user/social-accounts`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error((error.response.data as ApiError).error);
      }
      throw new Error("Failed to fetch social accounts");
    }
  },

  /**
   * Initiates verification process for a social account
   */
  startVerification: async (platform: string): Promise<VerificationRequest> => {
    try {
      const response = await apiClient.post<VerificationRequest>(
        `/user/social-accounts/${platform}/verify`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error((error.response.data as ApiError).error);
      }
      throw new Error(`Failed to start ${platform} verification`);
    }
  },

  /**
   * Confirms verification after OAuth flow completes
   */
  confirmVerification: async (
    platform: string,
    platformUserId: string,
    username: string,
    profileUrl?: string
  ): Promise<VerificationConfirm> => {
    try {
      const response = await apiClient.post<VerificationConfirm>(
        `/user/social-accounts/${platform}/confirm`,
        { platformUserId, username, profileUrl }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error((error.response.data as ApiError).error);
      }
      throw new Error(`Failed to confirm ${platform} verification`);
    }
  },

  /**
   * Deletes a social account
   */
  deleteAccount: async (accountId: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.delete<{ success: boolean }>(
        `/user/social-accounts/${accountId}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error((error.response.data as ApiError).error);
      }
      throw new Error("Failed to delete social account");
    }
  },
};

export { socialAccountApi, type SocialAccount };
