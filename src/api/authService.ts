import axios from 'axios';

// Define base API URL - should come from environment variables in production
const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001';

// Extract the base URL without any /api/auth path if present
const BASE_URL = API_BASE_URL.includes('/api/auth') 
  ? API_BASE_URL.split('/api/auth')[0] 
  : API_BASE_URL;

// Define the auth API endpoint
const AUTH_API_URL = `${BASE_URL}/api/auth`;

console.log('API base URL:', API_BASE_URL);
console.log('Extracted base URL:', BASE_URL);
console.log('Auth API URL:', AUTH_API_URL);

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
  message?: string; // Add message property for error responses
}

// Helper function to get token from localStorage
export const getEffectiveToken = (): string | null => {
  try {
    // Check localStorage first as cookies might be HttpOnly
    const localToken = localStorage.getItem('auth_token');
    if (localToken && localToken.length > 10) { // Basic validation that it's a real token
      console.log('Found auth_token in localStorage');
      return localToken;
    }
    
    // With HttpOnly cookies, we can't directly access them with JS
    // But we can make a test request to see if we're authenticated
    console.log('No token found in localStorage, cookies might be HttpOnly');
    
    // Note: For HttpOnly cookies, we won't be able to get the token value,
    // but we can still indicate that authentication might be available
    // The actual token will be sent automatically with fetch/axios requests
    // if credentials: 'include' is set
    
    // Return an indicator that tokens might be in HttpOnly cookies
    // We'll need to rely on the API calls with credentials: 'include'
    if (document.cookie.includes('auth_token') || document.cookie.includes('access_token')) {
      console.log('Found auth_token or access_token in cookie string (might be HttpOnly)');
      return 'http-only-cookie-present';
    }
    
    console.log('No token indicators found in cookies or localStorage');
    return null;
  } catch (error) {
    console.error('Error in getEffectiveToken:', error);
    return null;
  }
};

// getEffectiveToken is already exported above

// Axios instance with credentials (for cookies)
const api = axios.create({
  baseURL: AUTH_API_URL,
  withCredentials: true, // We're not using cookies anymore
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
});

// Set up request interceptor to add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = getEffectiveToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Added token to request headers');
    } else {
      console.log('No token available for request');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
      console.log('Attempting login with credentials:', { email: credentials.email });
      
      const response = await api.post('/login', credentials, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      console.log('Login response received:', {
        success: response.data.success,
        hasUser: !!response.data.user,
        hasToken: !!(response.data.token || response.data.accessToken || response.data.jwt)
      });
      
      if (response.data.success && response.data.user) {
        // Check for token in different possible locations
        let token = response.data.token || response.data.accessToken || response.data.jwt;
        
        if (token) {
          console.log('Token found in login response, length:', token.length);
          
          // Store token in localStorage only
          localStorage.setItem('auth_token', token);
          console.log('Token stored in localStorage');
          
          // Also store user data in localStorage
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // Verify the token was stored correctly
          const storedToken = localStorage.getItem('auth_token');
          if (storedToken !== token) {
            console.error('Token storage verification failed');
            throw new Error('Failed to store authentication token');
          }
          
          console.log('Login successful, token stored');
        } else {
          console.warn('No token found in login response, checking for token endpoint');
          
          try {
            // Try to get a fresh token using the session
            const tokenResponse = await api.get('/token');
            
            if (tokenResponse.data && tokenResponse.data.token) {
              const newToken = tokenResponse.data.token;
              console.log('Retrieved fresh token from /token');
              
              // Store the new token in localStorage only
              localStorage.setItem('auth_token', newToken);
              console.log('Updated token in localStorage');
              
              // Update the response with the new token
              response.data.token = newToken;
            } else {
              console.warn('No token received from /token endpoint');
              // Continue without a token if the server doesn't provide one
            }
          } catch (tokenError) {
            console.error('Failed to retrieve token from /token:', tokenError);
            // Don't fail the login if we can't get a token - the session might still be valid
          }
        }
        
        return response.data;
      } else {
        const errorMessage = response.data?.message || 'Login failed';
        console.error('Login failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Clear any partial authentication state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Server responded with an error status
          const errorMessage = error.response.data?.message || 'Login failed';
          throw new Error(errorMessage);
        } else if (error.request) {
          // Request was made but no response received
          throw new Error('Unable to connect to the authentication server. Please check your connection.');
        }
      }
      
      // Generic error for any other case
      throw new Error('An unexpected error occurred during login');
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Clear cookies by setting them to expire in the past
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      
      console.log('Cleared authentication data from localStorage and cookies');
    }
  },

  // Get current user profile
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const token = getEffectiveToken();
      
      console.log('Fetching current user with token:', token ? 'Token exists' : 'No token');
      console.log('Auth API URL:', AUTH_API_URL);
      
      // Use only the /me endpoint with the correct base URL
      console.log('Attempting to fetch user from /me endpoint');
      const response = await api.get('/me');
      
      console.log('User data response from /me:', response.data);
      
      if (response.data) {
        // If we get a token in the response, save it
        if (response.data.token) {
          localStorage.setItem('auth_token', response.data.token);
          console.log('Updated token from user data:', response.data.token.substring(0, 10) + '...');
        } else if (response.data.accessToken) {
          // Some APIs return accessToken instead of token
          localStorage.setItem('auth_token', response.data.accessToken);
          console.log('Updated token from accessToken:', response.data.accessToken.substring(0, 10) + '...');
        }
        
        // Extract token from response data or use existing token
        const effectiveToken = response.data.token || response.data.accessToken || token;
        
        // Transform the response to the expected format
        if (typeof response.data.success !== 'undefined') {
          // Already in the expected format
          return response.data;
        } else if (response.data.user) {
          // Some APIs nest the user data under a 'user' property
          return {
            success: true,
            user: response.data.user,
            token: effectiveToken
          };
        } else if (response.data.id || response.data._id) {
          // Direct user object, wrap it in the expected format
          return { 
            success: true, 
            user: response.data,
            token: effectiveToken
          };
        }
      }
      
      // No usable data
      return {
        success: false,
        message: 'No valid user data returned from /me endpoint'
      };
    } catch (error) {
      console.error('Get current user error:', error);
      
      // Try to get user from localStorage as fallback
      try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          console.log('Using cached user data as fallback');
          return {
            success: true,
            user: userData,
            token: getEffectiveToken()
          };
        }
      } catch (e) {
        console.error('Error reading user from localStorage:', e);
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get user data'
      };
    }
  },

  // Refresh token
  async refreshToken(): Promise<boolean> {
    try {
      const response = await api.post('/refresh-token');
      
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        console.log('Token refreshed and updated');
        return true;
      } else if (response.data.accessToken) {
        localStorage.setItem('auth_token', response.data.accessToken);
        console.log('Token refreshed and updated (accessToken)');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  },

  // Check if token is expired
  isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    
    try {
      // Decode JWT to get expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expiry;
    } catch (e) {
      console.error('Error checking token expiration:', e);
      return true; // Assume expired on error
    }
  },
  
  // Get token with automatic refresh if needed
  async getValidToken(): Promise<string | null> {
    let token = getEffectiveToken();
    
    // If no token, try to get from cookies
    if (!token) {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => 
        cookie.trim().startsWith('auth_token=') || 
        cookie.trim().startsWith('access_token=')
      );
      
      if (tokenCookie) {
        token = tokenCookie.split('=')[1].trim();
        localStorage.setItem('auth_token', token);
      }
    }
    
    // If still no token, return null
    if (!token) {
      return null;
    }
    
    // Check if token is expired
    if (this.isTokenExpired(token)) {
      console.log('Token expired, attempting to refresh...');
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return getEffectiveToken();
      }
      return null;
    }
    
    return token;
  },

  // Get the effective token (exposed for components)
  getToken(): string | null {
    return getEffectiveToken();
  },

  // Get user profile from the server
  async getUserProfile(): Promise<AuthResponse> {
    try {
      console.log('Fetching user profile from server...');
      
      // Make sure we have a valid token first
      const token = await this.getValidToken();
      if (!token) {
        console.warn('No valid token available for getUserProfile');
        return {
          success: false,
          message: 'No valid authentication token available'
        };
      }
      
      // Only use the /me endpoint with the correct base URL
      console.log('Trying /me endpoint');
      const response = await api.get('/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('User profile response from /me:', response.data);
      
      // Check response structure and adapt accordingly
      if (response.data) {
        // If we get a token in the response, save it
        if (response.data.token) {
          localStorage.setItem('auth_token', response.data.token);
          console.log('Updated token from profile data:', response.data.token.substring(0, 10) + '...');
        } else if (response.data.accessToken) {
          localStorage.setItem('auth_token', response.data.accessToken);
          console.log('Updated token from profile accessToken:', response.data.accessToken.substring(0, 10) + '...');
        }
        
        // Transform the response to the expected format
        if (typeof response.data.success !== 'undefined') {
          // Already in the expected format
          return response.data;
        } else if (response.data.user) {
          // Some APIs nest the user data under a 'user' property
          return {
            success: true,
            user: response.data.user,
            token: response.data.token || response.data.accessToken || token
          };
        } else if (response.data.id || response.data._id) {
          // Direct user object, wrap it in the expected format
          return {
            success: true,
            user: response.data,
            token: response.data.token || response.data.accessToken || token
          };
        }
      }
      
      // No usable data
      return {
        success: false,
        message: 'No valid user data returned from /me endpoint'
      };
    } catch (error) {
      console.error('Get user profile error:', error);
      
      // Try to use stored user data as fallback
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          return {
            success: true,
            user: JSON.parse(storedUser),
            token: getEffectiveToken()
          };
        }
      } catch (e) {
        console.error('Error reading stored user:', e);
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get user profile'
      };
    }
  },
  
  // Check authentication status
  async checkAuthStatus(): Promise<boolean> {
    try {
      // Try the dedicated check endpoint
      console.log('Checking authentication status...');
      const response = await api.get('/check');
      
      console.log('Auth check response:', response.data);
      
      // If response has isAuthenticated property, use it
      if (typeof response.data.isAuthenticated === 'boolean') {
        return response.data.isAuthenticated;
      }
      
      // If response has success property, use it
      if (typeof response.data.success === 'boolean') {
        return response.data.success;
      }
      
      // Otherwise assume success if we get a 200 response
      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      
      // If token exists but server check failed, might be temporary issue
      const token = getEffectiveToken();
      if (token && !this.isTokenExpired(token)) {
        console.log('Server check failed but valid token exists');
        return true;
      }
      
      return false;
    }
  },
  
  // Guest login
  async guestLogin(tableId?: string): Promise<AuthResponse> {
    try {
      console.log('Attempting guest login', tableId ? `for table ${tableId}` : 'without table ID');
      
      // Use the guest token endpoint instead of guest-login
      const response = await api.post('/guest-token', tableId ? { tableId } : {});
      
      console.log('Guest login response:', response.data);
      
      if (response.data.success && response.data.token) {
        // Store token in localStorage
        localStorage.setItem('auth_token', response.data.token);
        
        // Store user info if available
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        return response.data;
      } else {
        throw new Error(response.data.message || 'Guest login failed');
      }
    } catch (error) {
      console.error('Guest login error:', error);
      
      // Clear any partial auth state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Guest login failed');
      }
      
      throw new Error('Unable to connect to the authentication service');
    }
  },
  
  // Get Google OAuth URL for redirect
  getGoogleAuthUrl(): string {
    // Return the Google OAuth URL from the backend
    // The backend should have a route that redirects to Google's OAuth page
    console.log('Getting Google Auth URL, AUTH_API_URL is:', AUTH_API_URL);
    
    // Correctly format the URL without duplication
    return `${AUTH_API_URL}/google`;
  }
};

export default authService;
