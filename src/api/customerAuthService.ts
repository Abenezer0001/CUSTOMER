import axios from 'axios';
import { getEffectiveToken } from './authService';

// Define base API URL - should come from environment variables in production
const API_BASE_URL = 'https://api.inseat.achievengine.com/api/auth';

// Extract the base URL without the auth path
const BASE_URL = API_BASE_URL.split('/api/auth')[0] || 'https://api.inseat.achievengine.com';

// Customer API endpoint is at /api/customer
const CUSTOMER_API_ENDPOINT = `${BASE_URL}/api/customer`;

console.log('Customer API endpoint:', CUSTOMER_API_ENDPOINT);

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    loyaltyPoints?: number;
  };
  token?: string;
  accessToken?: string;
  jwt?: string;
  message?: string;
}

// Axios instance with credentials (for cookies)
const api = axios.create({
  baseURL: CUSTOMER_API_ENDPOINT,
  withCredentials: true, // This allows cookies to be sent and received
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set up request interceptor to add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = getEffectiveToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Added token to request headers');
    } else {
      console.log('No token available for request');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const customerAuthService = {
  // Register a new customer
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      console.log('Registering customer with data:', {
        ...userData,
        password: '[REDACTED]'
      });
      
      const response = await api.post('/register', userData);
      
      console.log('Customer registration response:', response.data);
      
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Customer registration error:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data as AuthResponse;
      }
      
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  },
  
  // Login with email and password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Logging in customer with email:', credentials.email);
      
      const response = await api.post('/login', credentials);
      
      console.log('Customer login response:', response.data);
      
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Customer login error:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data as AuthResponse;
      }
      
      return {
        success: false,
        message: 'Login failed. Please check your credentials and try again.'
      };
    }
  },
  
  // Logout customer (clear cookies on server)
  async logout(): Promise<void> {
    try {
      await api.post('/logout');
      localStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
  
  // Get current customer profile
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const token = getEffectiveToken();
      
      if (!token) {
        console.log('No token available, user is not authenticated');
        return {
          success: false,
          message: 'Not authenticated'
        };
      }
      
      const response = await api.get('/me');
      
      return {
        success: true,
        user: response.data.user
      };
    } catch (error) {
      console.error('Get current customer error:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          localStorage.removeItem('auth_token');
        }
        return error.response.data as AuthResponse;
      }
      
      return {
        success: false,
        message: 'Failed to retrieve user profile'
      };
    }
  },
  
  // Refresh the authentication token
  async refreshToken(): Promise<boolean> {
    try {
      const response = await api.post('/refresh-token');
      
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  },
  
  // Check authentication status
  async checkAuthStatus(): Promise<boolean> {
    try {
      const token = getEffectiveToken();
      
      if (!token) {
        console.log('No token available, user is not authenticated');
        return false;
      }
      
      const response = await api.get('/me');
      
      return response.data.success === true;
    } catch (error) {
      console.error('Auth status check error:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          localStorage.removeItem('auth_token');
        }
      }
      
      return false;
    }
  },
  
  // Get Google OAuth URL for redirect
  getGoogleAuthUrl(): string {
    return `${CUSTOMER_API_ENDPOINT}/google`;
  }
};

export default customerAuthService;
