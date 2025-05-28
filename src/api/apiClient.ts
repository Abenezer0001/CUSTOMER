import axios from 'axios';
import { API_BASE_URL } from '@/config/constants';

// Extract the base URL without any /api/auth path if present
const extractedBaseUrl = typeof API_BASE_URL === 'string' && API_BASE_URL.includes('/api/auth') 
  ? API_BASE_URL.split('/api/auth')[0] 
  : API_BASE_URL;

// Define the final BASE_URL used for API requests
const BASE_URL = extractedBaseUrl || 'https://api.inseat.achievengine.com';

// For debugging
console.log('API_BASE_URL:', API_BASE_URL);
console.log('Extracted BASE_URL for API client:', BASE_URL);

// Helper function to get token from various sources
const getEffectiveToken = (): string | null => {
  // Try localStorage first
  const localToken = localStorage.getItem('auth_token');
  if (localToken) {
    return localToken;
  }
  
  // Then try cookies
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => 
    cookie.trim().startsWith('auth_token=') || 
    cookie.trim().startsWith('access_token=')
  );
  
  if (tokenCookie) {
    return tokenCookie.split('=')[1].trim();
  }
  
  return null;
};

// Create a consistent API client with proper CORS and cookie handling
const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Essential for sending cookies with requests
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json'
  },
  // Add timeout to prevent hanging requests
  timeout: 15000,
});

// Add request interceptor to include Authorization header when token is available
apiClient.interceptors.request.use(
  (config) => {
    // FIXED: Handle API URLs correctly
    if (config.url) {
      // Remove any automatic /api/ prefixing - we'll just handle double prefixes
      if (config.url.includes('/api/api/')) {
        console.warn('⚠️ Double /api/ prefix detected in URL:', config.url);
        config.url = config.url.replace('/api/api/', '/api/');
        console.log('🔧 Fixed URL:', config.url);
      }
      
      // Log the final URL for debugging
      console.log('📝 Final request URL:', config.url);
    }

    // Track request method for debugging
    console.log(`🔷 Making ${config.method?.toUpperCase()} request to ${config.url}`);
    
    const token = getEffectiveToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Added token to request headers');
    } else {
      console.log('⚠️ No token available for request, relying on HttpOnly cookies');
    }
    
    // Log request info for debugging
    console.log('Request URL:', `${config.baseURL}${config.url}`);
    console.log('Request headers:', config.headers);
    
    return config;
  },
  (error) => {
    console.error('❌ Request configuration error:', error.message);
    return Promise.reject(error);
  }
);

// Token refresh mechanism
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Function to add callbacks to the refresh subscriber queue
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Function to notify all subscribers about the new token
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

// Function to handle token refresh failure
const onRefreshFailure = (error: any) => {
  refreshSubscribers = [];
  
  // Clear authentication data
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  
  // Redirect to login if needed
  if (window.location.pathname !== '/login' && 
      window.location.pathname !== '/signup' && 
      !window.location.pathname.includes('/table/')) {
    console.log('Redirecting to login page due to authentication failure');
    window.location.href = '/login';
  }
};

// Function to refresh the token
const refreshAuthToken = async (): Promise<string | null> => {
  try {
    console.log('🔄 Attempting to refresh token...');
    
    // Try to refresh using the dedicated endpoint
    try {
      // First try the /api/auth/refresh-token endpoint
      const response = await axios.post(`${BASE_URL}/api/auth/refresh-token`, {}, { 
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      });
      
      if (response.data?.token) {
        const newToken = response.data.token;
        
        // Save the new token
        localStorage.setItem('auth_token', newToken);
        
        // If a new refresh token is provided, save it
        if (response.data.refreshToken) {
          localStorage.setItem('refresh_token', response.data.refreshToken);
        }
        
        console.log('✅ Token refreshed successfully');
        return newToken;
      }
    } catch (refreshError) {
      console.log('First refresh attempt failed, trying alternative method...');
      
      // Try with refresh token if available
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${BASE_URL}/api/auth/refresh-token`, 
            { refreshToken },
            { 
              headers: { 'Content-Type': 'application/json' },
              withCredentials: true
            }
          );
          
          if (response.data?.token) {
            const newToken = response.data.token;
            
            // Save the new token
            localStorage.setItem('auth_token', newToken);
            
            // If a new refresh token is provided, save it
            if (response.data.refreshToken) {
              localStorage.setItem('refresh_token', response.data.refreshToken);
            }
            
            console.log('✅ Token refreshed successfully with refresh token');
            return newToken;
          }
        } catch (secondRefreshError) {
          console.error('Second refresh attempt failed:', secondRefreshError);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    return null;
  }
};

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API response success: ${response.config.method?.toUpperCase()} ${response.config.url} (${response.status})`);
    
    // Check if response data is usable
    if (response.data === undefined || response.data === null) {
      console.warn('⚠️ Response does not contain data property');
    }
    
    return response;
  },
  async (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Request timeout:', error.message);
    } else if (error.response) {
      // The server responded with a status code outside of 2xx range
      console.error(`❌ API request failed with status ${error.response.status}: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
      
      // Handle 401 Unauthorized errors with token refresh
      if (error.response.status === 401) {
        console.error('🔑 Authentication failed - invalid or expired token');
        
        // Check if token refresh is needed based on response
        const needsRefresh = error.response.data?.needsRefresh === true;
        
        if (needsRefresh && error.config && !error.config._retry) {
          if (isRefreshing) {
            // If already refreshing, wait for the new token
            try {
              const retryOriginalRequest = new Promise<any>((resolve) => {
                subscribeTokenRefresh((token: string) => {
                  // Replace the expired token with the new one
                  error.config.headers['Authorization'] = `Bearer ${token}`;
                  error.config._retry = true;
                  resolve(apiClient(error.config));
                });
              });
              return retryOriginalRequest;
            } catch (refreshError) {
              return Promise.reject(refreshError);
            }
          }
          
          // Start refreshing process
          isRefreshing = true;
          error.config._retry = true;
          
          try {
            // Attempt to refresh the token
            const newToken = await refreshAuthToken();
            
            if (newToken) {
              // Notify all subscribers about the new token
              onTokenRefreshed(newToken);
              
              // Retry the original request with the new token
              error.config.headers['Authorization'] = `Bearer ${newToken}`;
              return apiClient(error.config);
            } else {
              // Handle refresh failure
              onRefreshFailure(error);
              return Promise.reject(error);
            }
          } catch (refreshError) {
            // Handle refresh error
            onRefreshFailure(refreshError);
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }
      } else if (error.response.status === 403) {
        console.error('🔒 Authorization failed - insufficient permissions');
      } else if (error.response.status === 404) {
        console.error('🔍 Resource not found');
      } else if (error.response.status === 500) {
        console.error('💥 Server error');
      }
      
      // Log response data details
      if (error.response.data) {
        console.log('Response data:', error.response.data);
      }
    } else if (error.request) {
      console.error('❌ No response received:', error.message);
    } else {
      console.error('❌ Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
