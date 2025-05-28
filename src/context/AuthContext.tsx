import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { AuthService, getAuthHeader } from '@/services/AuthService';
import customerAuthService from '@/api/customerAuthService';
import { useNavigate } from 'react-router-dom';
import CartContext, { useCart } from '@/context/CartContext';

// Define types for authentication
interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  loyaltyPoints: number;
  name: string;
  createdAt: string;
  orders: any[];
  _id?: string; // Optional MongoDB _id
}

// Extended user data that might come from the API
interface ApiUserData {
  id?: string;
  _id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  loyaltyPoints?: number;
  name?: string;
  createdAt?: string | Date;
  orders?: any[];
  token?: string;
  refreshToken?: string;
}

// Response type from auth service
interface AuthResponseUser {
  success?: boolean;
  message?: string;
  user?: ApiUserData;
  token?: string;
  refreshToken?: string;
}

interface UserWithToken extends AuthUser {
  success?: boolean;
  token?: string;
  user?: ApiUserData;
}

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (firstName: string, lastName: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  googleLogin: () => void;
  guestLogin: (tableId?: string) => Promise<boolean>;
  customerLogin: (email: string, password: string) => Promise<boolean>;
  customerSignup: (firstName: string, lastName: string, email: string, password: string) => Promise<boolean>;
  customerGoogleLogin: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  addLoyaltyPoints: (points: number) => void;
  refreshToken: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  // Helper function to get token from all possible sources
  function getTokenFromAllSources(): string | null {
    // First try to use the AuthService's function
    try {
      // First check cookies
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => 
        cookie.trim().startsWith('auth_token=') || 
        cookie.trim().startsWith('access_token=')
      );
      
      if (tokenCookie) {
        const token = tokenCookie.split('=')[1].trim();
        console.log('Found token in cookies:', token);
        return token;
      }
      
      // Then check localStorage
      const localToken = localStorage.getItem('auth_token');
      if (localToken) {
        console.log('Found token in localStorage');
        return localToken;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    
    console.log('No token found in any source');
    return null;
  }

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // First check if we have a valid token
        const token = getTokenFromAllSources();
        if (token) {
          console.log('Found token during initialization');
          setToken(token);
          
          // Try to verify the token with the server
          const isValid = await AuthService.isAuthenticated();
          if (!isValid) {
            console.log('Token is invalid, clearing auth state');
            localStorage.removeItem('auth_token');
            setToken(null);
            setIsAuthenticated(false);
            setUser(null);
            setLoading(false);
            return;
          }
        } else {
          console.log('No token found during initialization');
          setLoading(false);
          return;
        }
        
        // Try to get user data from the auth/me endpoint (avoiding double /api/ prefix)
        try {
          console.log('Attempting to fetch user profile');
          // Make sure we're using the correct endpoint without duplicate /api/ prefix
          const userData = await AuthService.getCurrentUser();
          
          if (userData) {
            console.log('Successfully fetched user profile:', userData);
            
            // Helper function to safely get date string
            const getDateString = (date: string | Date | undefined): string => {
              if (!date) return new Date().toISOString();
              return typeof date === 'string' ? date : date.toISOString();
            };
            
            // Helper to safely access nested properties
            const safeGet = (obj: any, path: string, defaultValue: any): any => {
              return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? defaultValue;
            };
            
            // Get the ID, preferring id over _id
            const userId = (safeGet(userData, 'id', '') || safeGet(userData, '_id', '')).toString();
            
            // Generate a display name from available fields
            const firstName = safeGet(userData, 'firstName', '');
            const lastName = safeGet(userData, 'lastName', '');
            const email = safeGet(userData, 'email', '');
            const displayName = safeGet(userData, 'name', '') || 
              (firstName || lastName ? `${firstName} ${lastName}`.trim() : email || 'User');
            
            // Create the normalized user object with all required fields
            const normalizedUser: AuthUser = {
              id: userId,
              email: email,
              firstName: firstName,
              lastName: lastName,
              role: safeGet(userData, 'role', 'customer'),
              loyaltyPoints: safeGet(userData, 'loyaltyPoints', 0),
              name: displayName,
              createdAt: getDateString(safeGet(userData, 'createdAt', undefined)),
              orders: safeGet(userData, 'orders', []),
            };
            
            setUser(normalizedUser);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(normalizedUser));
            
            return; // Exit early on success
          } else {
            console.warn('Failed to get valid user data');
            // Clear invalid auth data
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setIsAuthenticated(false);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Save user data to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      const response = await AuthService.login({ email, password });
      console.log('Login response:', response);
      
      if (response.success && response.user) {
        // Transform the user object to match our frontend expectations
        const userData: AuthUser = {
          id: response.user.id || (response.user as any)._id || '',  // Handle both id and _id with type assertion
          email: response.user.email || '',
          firstName: response.user.firstName || '',
          lastName: response.user.lastName || '',
          role: response.user.role || 'customer',
          loyaltyPoints: response.user.loyaltyPoints || 0,
          name: `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim() || response.user.email || '',
          createdAt: response.user.createdAt?.toString() || new Date().toISOString(),
          orders: response.user.orders || [],
        };
        
        setUser(userData);
        
        // Get token from cookies after login
        const accessToken = getTokenFromAllSources();
        console.log('Token after login:', accessToken);
        
        if (accessToken) {
          console.log('Setting token after login:', accessToken);
          setToken(accessToken);
          setIsAuthenticated(true);
        } else {
          console.log('No token found in cookies after login!');
        }
        
        toast.success('Login successful!');
        return true;
      }
      
      toast.error('Invalid email or password');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (firstName: string, lastName: string, email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      const response = await AuthService.register({
        firstName,
        lastName,
        email,
        password
      });
      
      console.log('Signup response:', response);
      
      if (response.success && response.user) {
        // Transform the user object to match our frontend expectations
        const userData: AuthUser = {
          id: response.user.id || (response.user as any)._id || '',  // Handle both id and _id with type assertion
          email: response.user.email || '',
          firstName: response.user.firstName || '',
          lastName: response.user.lastName || '',
          role: response.user.role || 'customer',
          loyaltyPoints: response.user.loyaltyPoints || 0,
          name: `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim() || response.user.email || '',
          createdAt: response.user.createdAt?.toString() || new Date().toISOString(),
          orders: response.user.orders || [],
        };
        
        setUser(userData);
        
        // Get token from cookies after signup
        const accessToken = getTokenFromAllSources();
        console.log('Token after signup:', accessToken);
        
        if (accessToken) {
          console.log('Setting token after signup:', accessToken);
          setToken(accessToken);
          setIsAuthenticated(true);
        } else {
          console.log('No token found in cookies after signup!');
        }
        
        toast.success('Account created successfully!');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error instanceof Error ? error.message : 'Signup failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await AuthService.logout();
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      
      // Clear the cart when logging out
      // We need to do this through localStorage directly since we can't use the hook here
      localStorage.removeItem('cartItems');
      console.log('Cleared cart items from localStorage on logout');
      
      // Clear all auth-related cookies
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      
      toast.info('You have been logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = (): void => {
    // Get the base URL without the /api/auth path
    const baseUrl = import.meta.env.VITE_AUTH_API_URL?.split('/api/auth')[0] || import.meta.env.VITE_API_BASE_URL || 'https://api.inseat.achievengine.com';
    const googleAuthUrl = `${baseUrl}/api/auth/google`;
    console.log('Google login redirecting to:', googleAuthUrl);
    window.location.href = googleAuthUrl;
  };

  /**
   * Initialize guest login for users who don't want to create an account
   */
  const guestLogin = async (tableId?: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      console.log('Attempting guest login via AuthService...');
      
      // Create a device ID if not already stored
      const deviceId = localStorage.getItem('device_id') || `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      if (!localStorage.getItem('device_id')) {
        localStorage.setItem('device_id', deviceId);
      }
      
      // Use AuthService for guest login which now correctly handles the guest-token endpoint
      const response = await AuthService.guestLogin(tableId || '');
      
      if (response.success && response.token) {
        console.log('Guest login successful via AuthService');
        
        // Store the token in both localStorage and as a cookie for redundancy
        setToken(response.token);
        localStorage.setItem('auth_token', response.token);
        document.cookie = `access_token=${response.token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `auth_token=${response.token}; path=/; max-age=86400; SameSite=Lax`;
        
        // Create a guest user object using data from response when available
        const guestId = response.user?.id || 'guest-' + deviceId;
        const guestUser: AuthUser = {
          id: guestId,
          email: response.user?.email || `${deviceId}@guest.inseat.com`,
          firstName: response.user?.firstName || 'Guest',
          lastName: response.user?.lastName || 'User',
          role: 'guest',
          loyaltyPoints: 0,
          name: response.user?.firstName 
            ? `${response.user.firstName} ${response.user.lastName || 'User'}`
            : 'Guest User',
          createdAt: new Date().toISOString(),
          orders: []
        };
        
        setUser(guestUser);
        setIsAuthenticated(true);
        
        console.log('Guest user session created successfully', guestUser);
        toast.success('Continuing as guest');
        return true;
      }
      
      throw new Error('Guest login failed: ' + (response.error || 'Unknown error'));
    } catch (error) {
      console.error('Guest login error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create guest session');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Attempt to refresh the authentication token
   */
  const refreshToken = async (): Promise<boolean> => {
    try {
      console.log('Attempting to refresh token...');
      
      // Try to refresh the token with the server
      await AuthService.refreshToken();
      
      // Get the latest token
      const newToken = getTokenFromAllSources();
      if (newToken) {
        console.log('Got new token after refresh');
        setToken(newToken);
        setIsAuthenticated(true);
        return true;
      }
      
      // Check if we're authenticated after refresh
      const isAuthenticated = await AuthService.isAuthenticated();
      console.log('Authentication status after refresh:', isAuthenticated);
      
      if (isAuthenticated) {
        // If no token found but we're authenticated, try to get user data
        const userData = await AuthService.getCurrentUser() as any as UserWithToken;
        if (userData && (userData.success || userData.id)) {
          const email = userData.email || (userData.user?.email || '');
          console.log('Got user data after refresh:', email);
          setIsAuthenticated(true);
          
          // If we got a token in the response, save it
          if (userData.token) {
            console.log('Got new token from user data after refresh');
            setToken(userData.token);
            localStorage.setItem('auth_token', userData.token);
            
            // Also set as a cookie for redundancy
            document.cookie = `auth_token=${userData.token}; path=/; max-age=86400; SameSite=Lax`;
          }
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Clear authentication state on error
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      return false;
    }
  };

  const updateUser = (userData: Partial<AuthUser>) => {
    if (user) {
      setUser({ ...user, ...userData });
      toast.success('Profile updated');
      // In a real implementation, you would also update the user on the server
    }
  };

  const addLoyaltyPoints = (points: number) => {
    if (user) {
      const updatedUser = { 
        ...user, 
        loyaltyPoints: (user.loyaltyPoints || 0) + points 
      };
      setUser(updatedUser);
      toast.success(`${points} loyalty points added!`);
      // In a real implementation, you would also update the loyalty points on the server
    }
  };

  // Customer-specific authentication methods
  const customerLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Clear any existing auth state
      setUser(null);
      setIsAuthenticated(false);
      setToken(null);
      
      const response = await customerAuthService.login({ email, password });
      
      if (response.success && response.user) {
        const userData = response.user as unknown as ApiUserData;
        
        // Format user data
        const formattedUser: AuthUser = {
          id: userData.id || userData._id || '',
          email: userData.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          role: userData.role || 'customer',
          loyaltyPoints: userData.loyaltyPoints || 0,
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          createdAt: userData.createdAt?.toString() || new Date().toISOString(),
          orders: userData.orders || []
        };
        
        // Update auth state
        setUser(formattedUser);
        setIsAuthenticated(true);
        
        // Store token if available
        const authToken = response.token || response.accessToken || response.jwt;
        if (authToken) {
          setToken(authToken);
          localStorage.setItem('auth_token', authToken);
          console.log('Auth token stored in localStorage');
        }
        
        // Store refresh token if available
        if (response.refreshToken) {
          localStorage.setItem('refresh_token', response.refreshToken);
          console.log('Refresh token stored in localStorage');
        }
        
        toast.success('Logged in successfully');
        
        // Handle redirection
        handlePostAuthRedirect();
        
        return true;
      } else {
        // Clear any partial auth state on failure
        setUser(null);
        setIsAuthenticated(false);
        setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        
        toast.error(response.message || 'Login failed. Please check your credentials and try again.');
        return false;
      }
    } catch (error) {
      console.error('Customer login error:', error);
      
      // Clear auth state on error
      setUser(null);
      setIsAuthenticated(false);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      toast.error('An error occurred during login. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to handle post-authentication redirect
  const handlePostAuthRedirect = () => {
    // First check tableInfo in localStorage (has priority)
    const tableInfo = localStorage.getItem('tableInfo');
    console.log('Post-auth table info:', tableInfo);
    
    // Also check for currentTableId as a fallback
    const currentTableId = localStorage.getItem('currentTableId');
    console.log('Current table ID from localStorage:', currentTableId);
    
    // Logic for redirection:
    // 1. Try to use tableInfo.id if available
    // 2. Fall back to currentTableId if available
    // 3. Redirect to /scan if no table information is found
    
    if (tableInfo) {
      try {
        const parsedTableInfo = JSON.parse(tableInfo);
        if (parsedTableInfo?.id) {
          // Store the table ID in currentTableId for consistency
          localStorage.setItem('currentTableId', parsedTableInfo.id);
          console.log(`Redirecting to table page with ID: ${parsedTableInfo.id}`);
          navigate(`/?table=${parsedTableInfo.id}`, { replace: true });
          return;
        }
      } catch (e) {
        console.error('Error parsing table info:', e);
      }
    }
    
    // If tableInfo didn't work, try currentTableId
    if (currentTableId) {
      console.log(`Using currentTableId for redirection: ${currentTableId}`);
      navigate(`/?table=${currentTableId}`, { replace: true });
      return;
    }
    
    // Default redirect if no valid table info
    console.log('No valid table info, redirecting to scan page');
    navigate('/scan', { replace: true });
  };
  
  const customerSignup = async (firstName: string, lastName: string, email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Clear any existing auth state
      setUser(null);
      setIsAuthenticated(false);
      setToken(null);
      
      const response = await customerAuthService.register({
        firstName,
        lastName,
        email,
        password
      });
      
      if (response.success && response.user) {
        const userData = response.user as unknown as ApiUserData;
        
        // Format user data
        const formattedUser: AuthUser = {
          id: userData.id || userData._id || '',
          email: userData.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          role: userData.role || 'customer',
          loyaltyPoints: userData.loyaltyPoints || 0,
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          createdAt: userData.createdAt?.toString() || new Date().toISOString(),
          orders: userData.orders || []
        };
        
        // Update auth state
        setUser(formattedUser);
        setIsAuthenticated(true);
        
        // Store token if available
        const authToken = response.token || response.accessToken || response.jwt;
        if (authToken) {
          setToken(authToken);
          localStorage.setItem('auth_token', authToken);
          console.log('Auth token stored in localStorage');
        }
        
        // Store refresh token if available
        if (response.refreshToken) {
          localStorage.setItem('refresh_token', response.refreshToken);
          console.log('Refresh token stored in localStorage');
        }
        
        toast.success('Account created successfully');
        
        // Handle redirection
        handlePostAuthRedirect();
        
        return true;
      } else {
        // Clear any partial auth state on failure
        setUser(null);
        setIsAuthenticated(false);
        setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        
        toast.error(response.message || 'Registration failed. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Customer signup error:', error);
      
      // Clear auth state on error
      setUser(null);
      setIsAuthenticated(false);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      toast.error('An error occurred during registration. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  const customerGoogleLogin = () => {
    const baseUrl = import.meta.env.VITE_AUTH_API_URL?.split('/api/auth')[0] || import.meta.env.VITE_API_BASE_URL || 'https://api.inseat.achievengine.com';
    const googleAuthUrl = `${baseUrl}/api/customer/google`;
    console.log('Customer Google login redirecting to:', googleAuthUrl);
    window.location.href = googleAuthUrl;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: loading,
        isAuthenticated,
        token,
        login,
        signup,
        logout,
        googleLogin,
        guestLogin,
        customerLogin,
        customerSignup,
        customerGoogleLogin,
        updateUser,
        addLoyaltyPoints,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Create a custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export all components and hooks from a single location
export { AuthContext, AuthProvider };
