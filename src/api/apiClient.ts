import axios from 'axios';

// Get API URL directly from environment variables with fallback
const envApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
let processedApiUrl = envApiUrl;

// Ensure API_BASE_URL is the true root
if (processedApiUrl.endsWith('/api')) {
  processedApiUrl = processedApiUrl.slice(0, -4); // Remove last /api
} else if (processedApiUrl.endsWith('/api/')) { // also handle trailing slash
  processedApiUrl = processedApiUrl.slice(0, -5); // Remove last /api/
}

// Define the final BASE_URL used for API requests
const BASE_URL = processedApiUrl;

// For debugging
console.log('Environment VITE_API_BASE_URL:', envApiUrl);
console.log('Processed BASE_URL for API client:', BASE_URL);

// Helper function to get token from various sources
const getEffectiveToken = (): string | null => {
  // Try localStorage first
  const localToken = localStorage.getItem('auth_token');
  if (localToken && localToken !== 'http-only-cookie-present') {
    console.log('Found valid token in localStorage');
    return localToken;
  }
  
  // Then try cookies
  const cookies = document.cookie.split(';');
  const possibleCookieNames = ['auth_token=', 'access_token=', 'token=', 'jwt='];
  
  for (const cookieName of possibleCookieNames) {
    const cookieValue = cookies.find(cookie => cookie.trim().startsWith(cookieName));
    if (cookieValue) {
      const token = cookieValue.split('=')[1]?.trim();
      if (token && token.length > 10) { // Basic validation
        console.log(`Found ${cookieName.replace('=', '')} in cookies`);
        // Store in localStorage for future access
        localStorage.setItem('auth_token', token);
        return token;
      }
    }
  }
  
  // Try to get token from URL hash (for OAuth returns)
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const hashToken = hashParams.get('access_token');
  if (hashToken) {
    console.log('Found token in URL hash');
    localStorage.setItem('auth_token', hashToken);
    return hashToken;
  }
  
  // If no token found but we have substantial cookies, we might be using HttpOnly auth
  const cookieString = document.cookie;
  if (cookieString && cookieString.length > 50) {
    console.log('No accessible token but substantial cookies detected - likely HttpOnly authentication');
    return 'http-only-auth-detected';
  }
  
  console.log('No authentication token found');
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
    if (token && token !== 'http-only-auth-detected') {
      // Validate token format (basic JWT check)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.warn('⚠️ Invalid token format (not JWT):', token.substring(0, 20) + '...');
        // Clear invalid token
        localStorage.removeItem('auth_token');
      } else {
        try {
          // Check if token is expired
          const payload = JSON.parse(atob(tokenParts[1]));
          const now = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp < now) {
            console.warn('⚠️ Token is expired, clearing from storage');
            localStorage.removeItem('auth_token');
            // Don't add expired token to headers
          } else {
            config.headers['Authorization'] = `Bearer ${token}`;
            console.log('✅ Added valid token to request headers for:', config.url);
          }
        } catch (err) {
          console.warn('⚠️ Could not decode token payload, using as-is:', err);
          config.headers['Authorization'] = `Bearer ${token}`;
          console.log('✅ Added token to request headers for:', config.url);
        }
      }
    } else if (token === 'http-only-auth-detected') {
      console.log('✅ Using HttpOnly cookie authentication for:', config.url);
      // Don't add Authorization header, rely on withCredentials: true
    } else {
      console.log('⚠️ No token available for request to:', config.url, 'relying on HttpOnly cookies');
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
  
  // Dispatch custom event instead of forcing redirect
  console.log('Authentication failed - dispatching auth-failed event');
  window.dispatchEvent(new CustomEvent('auth-failed', { 
    detail: { error, timestamp: Date.now() } 
  }));
  
  // Only redirect for critical auth failures, not for rating API calls
  // Let individual components handle their own auth errors gracefully
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
        
        // Check if token refresh is needed based on response or if we have a refresh mechanism
        const needsRefresh = error.response.data?.needsRefresh === true || 
                            error.response.data?.message?.includes('expired') ||
                            error.response.data?.message?.includes('invalid');
        
        if (error.config && !error.config._retry) {
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
