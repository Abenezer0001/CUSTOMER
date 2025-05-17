import axios from 'axios';

// Define base API URL - should come from environment variables in production
const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL;

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
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    loyaltyPoints?: number;
  };
}

// Axios instance with credentials (for cookies)
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // This allows cookies to be sent and received
  headers: {
    'Content-Type': 'application/json',
  },
});

const authService = {
  // Register a new user
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await api.post('/register', userData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Registration failed');
      }
      throw new Error('Unable to connect to authentication service');
    }
  },

  // Login with email and password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post('/login', credentials);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Login failed');
      }
      throw new Error('Unable to connect to authentication service');
    }
  },

  // Logout user (clear cookies on server)
  async logout(): Promise<void> {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the server request fails, we'll still clear local storage
      localStorage.removeItem('user');
    }
  },

  // Get current user profile
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const response = await api.get('/me');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error('Failed to get user profile');
    }
  },

  // Refresh the authentication token
  async refreshToken(): Promise<boolean> {
    try {
      await api.post('/refresh-token');
      return true;
    } catch (error) {
      return false;
    }
  },

  // Initiate Google OAuth login with state parameter for security
  getGoogleAuthUrl(): string {
    // Generate a random state parameter to protect against CSRF
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state in localStorage to verify when the user returns
    localStorage.setItem('oauth_state', state);
    
    // Ensure correct path construction by using the base URL without duplicate /auth
    // API_BASE_URL should be http://localhost:3001/api/auth
    console.log('API_BASE_URL:', API_BASE_URL);
    
    // Ensure we're using the correct URL structure - this should resolve to http://localhost:3001/api/auth/google
    const fullUrl = `${API_BASE_URL}/google?state=${state}`;
    console.log('Google Auth URL:', fullUrl);
    
    return fullUrl;
  },

  // Check authentication status
  async checkAuthStatus(): Promise<boolean> {
    try {
      const response = await api.get('/check');
      return response.data.isAuthenticated;
    } catch (error) {
      return false;
    }
  }
};

export default authService;
