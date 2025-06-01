import axios from 'axios';
import { toast } from 'sonner';

// API URL configuration
// Extract base URL without any trailing /api to prevent double prefixes
let API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// Remove any trailing /api if present to avoid double prefix
if (API_BASE.endsWith('/api')) {
  API_BASE = API_BASE.slice(0, -4);
}
const API_URL = `${API_BASE}/api`;
console.log('Auth Service API URL:', API_URL);

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

// Function to get the auth token from cookies ONLY
const getEffectiveToken = (): string | null => {
  // First check cookies for access_token (set by backend after Google auth)
  const cookies = document.cookie.split(';').map(c => c.trim());
  const accessTokenCookie = cookies.find(c => c.startsWith('access_token='));
  
  if (accessTokenCookie) {
    const token = accessTokenCookie.split('=')[1];
    console.log('Found access_token in cookies');
    return token;
  }
  
  // Then check for auth_token in cookies
  const authTokenCookie = cookies.find(c => c.startsWith('auth_token='));
  if (authTokenCookie) {
    const token = authTokenCookie.split('=')[1];
    console.log('Found auth_token in cookies');
    return token;
  }
  
  // Check localStorage as fallback (for non-Google logins)
  const localToken = localStorage.getItem('auth_token');
  if (localToken) {
    console.log('Found auth_token in localStorage');
    return localToken;
  }
  
  console.log('No authentication token found in cookies or localStorage');
  return null;
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
      console.log('Attempting to get current user with auth headers');
      // Log cookies for debugging
      console.log('Cookies for /auth/me request:', document.cookie);
      
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { ...getAuthHeader() },
        withCredentials: true // Ensure cookies are sent with request
      });
      
      if (response.data.success) {
        console.log('Successfully retrieved user from /auth/me');
        return response.data.user;
      }
      
      console.log('Get current user unsuccessful:', response.data);
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },
  
  // Refresh token
  refreshToken: async (): Promise<boolean> => {
    try {
      console.log('Attempting to refresh token...');
      // When using HttpOnly cookies, we need to ensure cookies are sent
      const response = await axios.post(`${API_URL}/auth/refresh-token`, {}, {
        withCredentials: true // Critical for sending refresh token cookie
      });
      
      console.log('Refresh token response:', response.data);
      if (response.data.success) {
        // No need to manually set cookies for HttpOnly cookies
        // Backend will have set new cookies in response
        console.log('Token refresh successful');
        return true;
      }
      
      console.log('Token refresh failed:', response.data);
      return false;
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
        // Only using cookies for token storage, not localStorage
        
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
    // Store current table ID before redirecting
    const tableId = localStorage.getItem('currentTableId') || 
                   localStorage.getItem('tableId') || 
                   localStorage.getItem('table_id');
    
    if (tableId) {
      // Store in sessionStorage to survive the redirect
      sessionStorage.setItem('tableId', tableId);
      console.log('Stored table ID in session storage before Google login:', tableId);
      
      // Add table ID to the redirect URL as a query parameter
      window.location.href = `${API_URL}/auth/google?table=${tableId}`;
    } else {
      window.location.href = `${API_URL}/auth/google`;
    }
  }
}; 