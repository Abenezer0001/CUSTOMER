import axios, { AxiosError, AxiosResponse } from 'axios';
import { getEffectiveToken } from './authService';

// Define base API URL - should come from environment variables in production
const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001/api/auth';

// Extract the base URL without the auth path
const BASE_URL = API_BASE_URL.split('/api/auth')[0] || 'http://localhost:3001';

// Customer API endpoint is at /api/customer
const CUSTOMER_API_ENDPOINT = `${BASE_URL}/api/customer`;

console.log('Customer API endpoint:', CUSTOMER_API_ENDPOINT);

// Helper function to handle API errors
const handleApiError = (error: unknown): AuthResponse => {
  console.error('API Error:', error);
  
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    if (axiosError.response) {
      // Server responded with an error status code
      const responseData = axiosError.response.data as any;
      return {
        success: false,
        message: responseData?.message || 'An error occurred. Please try again.'
      };
    } else if (axiosError.request) {
      // Request was made but no response received
      return {
        success: false,
        message: 'Unable to connect to the server. Please check your internet connection.'
      };
    }
  }
  
  // Unknown error
  return {
    success: false,
    message: 'An unexpected error occurred. Please try again.'
  };
};

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
  refreshToken?: string;
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
      
      const response = await api.post<AuthResponse>('/register', userData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      });

      console.log('Customer registration response:', response.data);
      
      // Store the token if available
      const { token, refreshToken } = response.data;
      if (token) {
        localStorage.setItem('auth_token', token);
        console.log('Auth token stored in localStorage');
      }
      
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
        console.log('Refresh token stored in localStorage');
      }
      
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Login with email and password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Logging in customer with email:', credentials.email);
      
      const response = await api.post<AuthResponse>('/login', credentials, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true, // Ensure cookies are sent/received
        timeout: 10000 // 10 seconds timeout
      });
      
      console.log('Customer login response:', response.data);
      
      // Store the tokens if available
      const { token, refreshToken } = response.data;
      if (token) {
        // Store in localStorage
        localStorage.setItem('auth_token', token);
        
        // Also set as a cookie for cross-request authentication
        document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Lax`;
        
        console.log('Auth token stored in localStorage and cookie');
      }
      
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
        document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
        console.log('Refresh token stored in localStorage and cookie');
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      return handleApiError(error);
    }
  },
  
  // Logout customer (clear cookies on server)
  async logout(): Promise<void> {
    try {
      console.log('Logging out customer user');
      // Use the customer-specific logout endpoint that doesn't require authentication
      await api.post('/logout', {}, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 5000 // 5 seconds timeout
      });
      
      // Clear all auth tokens from localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      console.log('Auth tokens cleared from localStorage');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the server request fails, still clear local tokens
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      console.log('Auth tokens cleared from localStorage despite server error');
    }
  },
  
  // Get current customer profile
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      // Check for tokens in both cookies and localStorage
      const cookies = document.cookie.split(';').map(c => c.trim());
      const accessTokenCookie = cookies.find(c => c.startsWith('access_token='));
      const authTokenCookie = cookies.find(c => c.startsWith('auth_token='));
      
      // Determine which token to use
      let token = null;
      let tokenSource = '';
      
      if (accessTokenCookie) {
        token = accessTokenCookie.split('=')[1];
        tokenSource = 'access_token cookie';
      } else if (authTokenCookie) {
        token = authTokenCookie.split('=')[1];
        tokenSource = 'auth_token cookie';
      } else {
        token = localStorage.getItem('auth_token');
        tokenSource = 'localStorage';
      }
      
      if (!token) {
        console.log('No token available, user is not authenticated');
        return {
          success: false,
          message: 'Not authenticated'
        };
      }
      
      console.log(`Using token from ${tokenSource} for authentication`);
      
      // Make the request with explicit Authorization header and credentials
      const response = await api.get('/me', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true // Ensure cookies are sent
      });
      
      console.log('Current user retrieved successfully:', response.data);
      
      return {
        success: true,
        user: response.data.user
      };
    } catch (error) {
      console.error('Get current customer error:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          console.log('Authentication failed (401), clearing tokens');
          localStorage.removeItem('auth_token');
          document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
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
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        console.log('No refresh token available');
        return false;
      }
      
      console.log('Attempting to refresh access token...');
      
      const response = await api.post<AuthResponse>('/refresh-token', { refreshToken }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      });
      
      const { token, refreshToken: newRefreshToken } = response.data;
      
      if (token) {
        localStorage.setItem('auth_token', token);
        console.log('Access token refreshed successfully');
        
        // Update refresh token if a new one was provided
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
          console.log('Refresh token updated');
        }
        
        return true;
      }
      
      console.log('No new token received in refresh response');
      return false;
    } catch (error) {
      console.error('Refresh token error:', error);
      
      // Clear invalid tokens on error
      if (error.response?.status === 401) {
        console.log('Refresh token invalid or expired, clearing tokens');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
      }
      
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
    // Store current table ID before redirecting
    const tableId = localStorage.getItem('currentTableId') || 
                   localStorage.getItem('tableId') || 
                   localStorage.getItem('table_id');
    
    if (tableId) {
      // Store in sessionStorage to survive the redirect
      sessionStorage.setItem('tableId', tableId);
      console.log('Stored table ID in session storage before Google login:', tableId);
      
      // Add table ID to the redirect URL as a query parameter
      return `${API_BASE_URL}/google?table=${tableId}`;
    }
    
    return `${API_BASE_URL}/google`;
  }
};

export default customerAuthService;
