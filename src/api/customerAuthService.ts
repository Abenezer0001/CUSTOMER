import axios, { AxiosError, AxiosResponse } from 'axios';
import { getEffectiveToken } from './authService';

// Define base API URL - should come from environment variables in production
const envApiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_AUTH_API_URL ;

console.log('Environment VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('Environment VITE_AUTH_API_URL:', import.meta.env.VITE_AUTH_API_URL);

// Ensure we have the base URL without /api suffix
let processedApiUrl = envApiUrl;
if (processedApiUrl.endsWith('/api')) {
  processedApiUrl = processedApiUrl.slice(0, -4);
} else if (processedApiUrl.endsWith('/api/')) {
  processedApiUrl = processedApiUrl.slice(0, -5);
}

// Customer API endpoint is at /api/customer
const CUSTOMER_API_ENDPOINT = `${processedApiUrl}/api/customer`;
// Auth API endpoint for /me requests
const AUTH_API_ENDPOINT = `${processedApiUrl}/api/auth`;

console.log('Using processed API URL:', processedApiUrl);
console.log('Customer API endpoint:', CUSTOMER_API_ENDPOINT);
console.log('Auth API endpoint:', AUTH_API_ENDPOINT);

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
  tableId?: string; // Optional table ID for associating customer with restaurant
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

// Create axios instance for customer API  
const api = axios.create({
  baseURL: CUSTOMER_API_ENDPOINT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Create axios instance for auth API (for /me endpoint)
const authApi = axios.create({
  baseURL: AUTH_API_ENDPOINT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
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
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    try {
      // Get tableId from localStorage if not provided in userData
      let tableId = userData.tableId;
      if (!tableId) {
        // Try to get tableId from various localStorage keys
        tableId = localStorage.getItem('currentTableId') || 
                 localStorage.getItem('tableId') || 
                 sessionStorage.getItem('tableId') || 
                 undefined;
        
        // Also check URL parameters as fallback
        if (!tableId) {
          const urlParams = new URLSearchParams(window.location.search);
          tableId = urlParams.get('table') || undefined;
        }
      }
      
      // Prepare registration data with tableId if available
      const registrationData = {
        ...userData,
        ...(tableId && { tableId })
      };
      
      console.log('Registering customer with data:', {
        ...registrationData,
        password: '[REDACTED]',
        tableId: tableId || 'Not provided'
      });
      
      const response = await api.post<AuthResponse>('/register', registrationData, {
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
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
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
  logout: async (): Promise<void> => {
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
  getCurrentUser: async (): Promise<AuthResponse> => {
    try {
      console.log('Checking authentication status...');
      console.log('Document cookies:', document.cookie);
      
      // Log all cookies for debugging
      const cookies = document.cookie.split(';').map(c => c.trim());
      console.log('Parsed cookies:', cookies);
      
      // Check for tokens in both cookies and localStorage
      const accessTokenCookie = cookies.find(c => c.startsWith('access_token='));
      const refreshTokenCookie = cookies.find(c => c.startsWith('refresh_token='));
      const authTokenCookie = cookies.find(c => c.startsWith('auth_token='));
      const localToken = localStorage.getItem('auth_token');
      
      console.log('access_token cookie exists:', !!accessTokenCookie);
      console.log('refresh_token cookie exists:', !!refreshTokenCookie);
      console.log('auth_token cookie exists:', !!authTokenCookie);
      console.log('localStorage token exists:', !!localToken);
      
      // Get auth headers using multiple fallback methods
      const getAuthHeaders = () => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        // Try to get token from multiple sources
        let token = localStorage.getItem('auth_token') ||
                   localStorage.getItem('access_token') ||
                   localStorage.getItem('jwt');
        
        // If no token in localStorage, try to extract from non-HTTP-only cookies
        if (!token) {
          const cookies = document.cookie.split(';');
          const tokenCookie = cookies.find(cookie => 
            cookie.trim().startsWith('auth_token=') || 
            cookie.trim().startsWith('access_token=') ||
            cookie.trim().startsWith('jwt=')
          );
          
          if (tokenCookie) {
            token = tokenCookie.split('=')[1].trim();
          }
        }

        if (token && token !== 'http-only-cookie-present') {
          headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
      };
      
      const authHeaders = getAuthHeaders();
      console.log('Using auth headers:', authHeaders);
      
      // Set auth state to true if we have any token
      if (authHeaders.Authorization) {
        window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isAuthenticated: true } }));
      }
      
      // Try customer endpoint first using fetch
      try {
        console.log('Making customer /me request with fetch...');
        const response = await fetch(`${CUSTOMER_API_ENDPOINT}/me`, {
          method: 'GET',
          headers: authHeaders,
          credentials: 'include'
        });
        
        console.log('Customer endpoint response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Current customer retrieved successfully from customer endpoint:', data);
          
          return {
            success: true,
            user: data.user
          };
        } else {
          throw new Error(`Customer endpoint failed with status: ${response.status}`);
        }
      } catch (customerError) {
        console.log('Customer endpoint failed, trying auth endpoint:', customerError);
        
        // Fallback to auth endpoint if customer endpoint fails
        try {
          console.log('Making auth /me request with fetch...');
          const response = await fetch(`${AUTH_API_ENDPOINT}/me`, {
            method: 'GET',
            headers: authHeaders,
            credentials: 'include'
          });
          
          console.log('Auth endpoint response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('Current user retrieved successfully from auth endpoint:', data);
      
            return {
              success: true,
              user: data.user
            };
          } else {
            throw new Error(`Auth endpoint failed with status: ${response.status}`);
          }
        } catch (authError) {
          console.error('Both customer and auth endpoints failed:', authError);
          throw authError;
        }
      }
    } catch (error) {
      console.error('Get current customer error:', error);
      
      // Handle 401 errors specifically
      if (error instanceof Error && error.message.includes('401')) {
        console.log('Customer authentication failed (401), clearing tokens');
        localStorage.removeItem('auth_token');
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        return {
          success: false,
          message: 'Authentication failed'
        };
      }
      
      return {
        success: false,
        message: 'Failed to retrieve customer profile'
      };
    }
  },
  
  // Refresh the authentication token
  refreshToken: async (): Promise<boolean> => {
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
  checkAuthStatus: async (): Promise<boolean> => {
    try {
      // Get auth headers using the same method as getCurrentUser
      const getAuthHeaders = () => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        // Try to get token from multiple sources
        let token = localStorage.getItem('auth_token') ||
                   localStorage.getItem('access_token') ||
                   localStorage.getItem('jwt');
        
        // If no token in localStorage, try to extract from non-HTTP-only cookies
        if (!token) {
          const cookies = document.cookie.split(';');
          const tokenCookie = cookies.find(cookie => 
            cookie.trim().startsWith('auth_token=') || 
            cookie.trim().startsWith('access_token=') ||
            cookie.trim().startsWith('jwt=')
          );
          
          if (tokenCookie) {
            token = tokenCookie.split('=')[1].trim();
          }
        }

        if (token && token !== 'http-only-cookie-present') {
          headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
      };
      
      const authHeaders = getAuthHeaders();
      console.log('Checking auth status with headers:', authHeaders);
      
      // Check if we have any token indication (including HTTP-only cookies)
      const hasAnyTokenIndication = authHeaders.Authorization || 
                                   document.cookie.includes('auth_token=') ||
                                   document.cookie.includes('access_token=') ||
                                   localStorage.getItem('auth_token') ||
                                   localStorage.getItem('access_token');
      
      if (!hasAnyTokenIndication) {
        console.log('No token indication available, user is not authenticated');
        return false;
      }
      
      // Try auth endpoint using fetch
      const response = await fetch(`${AUTH_API_ENDPOINT}/me`, {
        method: 'GET',
        headers: authHeaders,
        credentials: 'include'
      });
      
      console.log('Auth status check response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        return data.success === true;
      } else if (response.status === 401) {
        console.log('Auth check failed (401), clearing tokens');
        localStorage.removeItem('auth_token');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Auth status check error:', error);
      
      if (error instanceof Error && error.message.includes('401')) {
        localStorage.removeItem('auth_token');
      }
      
      return false;
    }
  },
  
  // Get Google OAuth URL for redirect
  getGoogleAuthUrl: (): string => {
    // Store current table ID before redirecting
    const tableId = localStorage.getItem('currentTableId') || 
                   localStorage.getItem('tableId') || 
                   localStorage.getItem('table_id');
    
    if (tableId) {
      // Store in sessionStorage to survive the redirect
      sessionStorage.setItem('tableId', tableId);
      console.log('Stored table ID in session storage before Google login:', tableId);
      
      // Add table ID to the redirect URL as a query parameter
      return `${processedApiUrl}/google?table=${tableId}`;
    }
    
    return `${processedApiUrl}/google`;
  }
};

export default customerAuthService;
