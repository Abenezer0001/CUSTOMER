import axios from 'axios';
import { toast } from 'sonner';

// API URL configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// User interface
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  loyaltyPoints?: number;
  name?: string;
  createdAt?: string;
  orders?: any[];
}

// Login credentials interface
export interface LoginCredentials {
  email: string;
  password: string;
}

// Register credentials interface
export interface RegisterCredentials {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// Configure axios to include credentials
axios.defaults.withCredentials = true;

// Function to get the auth token from cookies or localStorage
const getEffectiveToken = (): string | null => {
  // First check cookies
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => 
    cookie.trim().startsWith('auth_token=') || 
    cookie.trim().startsWith('access_token=')
  );
  
  if (tokenCookie) {
    return tokenCookie.split('=')[1].trim();
  }
  
  // Then check localStorage
  return localStorage.getItem('auth_token');
};

// Function to get Authorization header with properly formatted token
export const getAuthHeader = (): { Authorization: string } | {} => {
  const token = getEffectiveToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

export const AuthService = {
  // Login user
  login: async (credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      
      if (response.data.success) {
        return {
          success: true,
          user: response.data.user
        };
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed. Please try again.'
      };
    }
  },
  
  // Register new user
  register: async (credentials: RegisterCredentials): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, credentials);
      
      if (response.data.success) {
        return {
          success: true,
          user: response.data.user
        };
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed. Please try again.'
      };
    }
  },
  
  // Logout user
  logout: async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
      toast.success('Logged out successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Logout failed. Please try again.'
      };
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    try {
      const response = await axios.get(`${API_URL}/auth/check`, {
        headers: { ...getAuthHeader() }
      });
      return response.data.isAuthenticated;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  },
  
  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { ...getAuthHeader() }
      });
      
      if (response.data.success) {
        return response.data.user;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },
  
  // Refresh token
  refreshToken: async (): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/auth/refresh-token`);
      return response.data.success;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  },
  
  // Guest login with table ID
  guestLogin: async (tableId: string): Promise<{ success: boolean; token?: string; user?: User; error?: string }> => {
    try {
      // Create a device ID if not already stored
      const deviceId = localStorage.getItem('device_id') || `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      if (!localStorage.getItem('device_id')) {
        localStorage.setItem('device_id', deviceId);
      }
      
      // Use the correct endpoint: guest-token
      const response = await axios.post(`${API_URL}/auth/guest-token`, {
        tableId,
        deviceId
      });
      
      if (response.data.success && response.data.token) {
        // Store the token in localStorage as a fallback
        localStorage.setItem('auth_token', response.data.token);
        
        // Set token in cookie for cross-page consistency
        document.cookie = `auth_token=${response.data.token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `access_token=${response.data.token}; path=/; max-age=86400; SameSite=Lax`;
        
        // Create a guest user object from the response data
        const guestUser: User = {
          id: response.data.user?.id || `guest-${deviceId}`,
          email: response.data.user?.email || `${deviceId}@guest.inseat.com`,
          firstName: response.data.user?.firstName || 'Guest',
          lastName: response.data.user?.lastName || 'User',
          role: 'guest'
        };
        
        return {
          success: true,
          token: response.data.token,
          user: guestUser
        };
      }
      
      return { success: false, error: 'Guest login failed' };
    } catch (error: any) {
      console.error('Guest login error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Guest login failed. Please try again.'
      };
    }
  },
  
  // Google OAuth login
  loginWithGoogle: (): void => {
    window.location.href = `${API_URL}/auth/google`;
  }
}; 