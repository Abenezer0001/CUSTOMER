import axios from 'axios';
import { toast } from 'sonner';

// API URL configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// User interface
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
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
      const response = await axios.get(`${API_URL}/auth/check`);
      return response.data.isAuthenticated;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  },
  
  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      
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
  
  // Google OAuth login
  loginWithGoogle: (): void => {
    window.location.href = `${API_URL}/auth/google`;
  }
}; 