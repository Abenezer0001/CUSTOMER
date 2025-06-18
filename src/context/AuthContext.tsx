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
  setIsAuthenticated: (value: boolean) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  // Helper function to get token from all possible sources
  function getTokenFromAllSources(): string | null {
    try {
      const cookies = document.cookie.split(';');
      
      // First check for access_token (from Google OAuth)
      const accessTokenCookie = cookies.find(cookie => cookie.trim().startsWith('access_token='));
      if (accessTokenCookie) {
        const token = accessTokenCookie.split('=')[1].trim();
        console.log('Found access_token in cookies:', token.substring(0, 20) + '...');
        // Store in localStorage for consistency
        localStorage.setItem('auth_token', token);
        return token;
      }
      
      // Then check for auth_token
      const authTokenCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
      if (authTokenCookie) {
        const token = authTokenCookie.split('=')[1].trim();
        console.log('Found auth_token in cookies:', token.substring(0, 20) + '...');
        // Store in localStorage for consistency
        localStorage.setItem('auth_token', token);
        return token;
      }
      
      // Finally check localStorage as fallback
      const localToken = localStorage.getItem('auth_token');
      if (localToken) {
        console.log('Found token in localStorage:', localToken.substring(0, 20) + '...');
        return localToken;
      }
    } catch (error) {
      console.error('Error getting token from cookies:', error);
    }
    
    console.log('No accessible token found in cookies or localStorage');
    return null;
  }

  // Helper function to check if we might be authenticated via HTTP-only cookies
  function hasHttpOnlyAuth(): boolean {
    try {
      const cookieString = document.cookie;
      const cookies = cookieString.split(';');
      
      // Check for common auth cookie patterns that might be HTTP-only
      const hasAuthIndicators = cookies.some(cookie => {
        const trimmed = cookie.trim();
        return trimmed.includes('session') || 
               trimmed.includes('sid') ||
               trimmed.includes('connect.sid') ||
               cookieString.length > 100; // Substantial cookie content suggests auth cookies
      });
      
      // Also check if we have a stored user which would indicate previous successful auth
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          if (userObj && userObj.id && userObj.email) {
            console.log('Found valid user data in localStorage, likely authenticated via HTTP-only cookies');
            return true;
          }
        } catch (e) {
          console.error('Error parsing stored user data:', e);
        }
      }
      
      return hasAuthIndicators;
    } catch (error) {
      console.error('Error checking HTTP-only auth:', error);
      return false;
    }
  }

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // First check if we have a valid token
        const token = getTokenFromAllSources();
        if (token) {
          console.log('Found accessible token during initialization');
          setToken(token);
        } else {
          console.log('No accessible token found during initialization');
          
          // Check if we might have HTTP-only auth cookies
          if (hasHttpOnlyAuth()) {
            console.log('HTTP-only authentication cookies detected, attempting to verify');
          } else {
            console.log('No authentication detected, user should login');
            setLoading(false);
            setIsAuthenticated(false);
            return;
          }
        }
        
        // Check if we have Google OAuth cookies - if so, clear any guest data
        const cookies = document.cookie.split(';');
        const hasAccessToken = cookies.some(cookie => cookie.trim().startsWith('access_token='));
        const hasRefreshToken = cookies.some(cookie => cookie.trim().startsWith('refresh_token='));
        
        if (hasAccessToken || hasRefreshToken) {
          console.log('Google OAuth cookies detected, clearing any guest user data');
          localStorage.removeItem('user'); // Clear any stored guest user data
          setUser(null); // Clear current user state
          setIsAuthenticated(false); // Reset auth state
        }
        
        // Try to get user data from customer auth service first (for Google OAuth users)
        try {
          console.log('Attempting to fetch user profile from customerAuthService');
          
          // First try customer auth service (handles Google OAuth properly)
          const customerResponse = await customerAuthService.getCurrentUser();
          console.log('AuthContext: customerAuthService response:', customerResponse);
          
          if (customerResponse.success && customerResponse.user) {
            const userData = customerResponse.user;
            console.log('Found user data from customerAuthService:', userData);
            
            // Generate a display name from available fields
            const firstName = userData.firstName || '';
            const lastName = userData.lastName || '';
            const email = userData.email || '';
            const displayName = firstName && lastName 
              ? `${firstName} ${lastName}`.trim() 
              : email || 'User';
            
            // Create the normalized user object with all required fields
            const normalizedUser: AuthUser = {
              id: userData.id,
              email: email,
              firstName: firstName,
              lastName: lastName,
              role: userData.role || 'customer',
              loyaltyPoints: userData.loyaltyPoints || 0,
              name: displayName,
              createdAt: (userData as any).createdAt || new Date().toISOString(),
              orders: (userData as any).orders || [],
            };
            
            setUser(normalizedUser);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(normalizedUser));
            
            console.log('Authentication successful via customerAuthService, user set:', normalizedUser.email);
            return; // Exit early on success
          }
          
          // If customer auth fails, try regular AuthService as fallback
          console.log('Customer auth failed, trying AuthService as fallback');
          const userData = await AuthService.getCurrentUser();
          console.log('AuthContext: AuthService response:', userData);
          
          if (userData && userData.id && userData.email) {
            // Generate a display name from available fields
            const firstName = userData.firstName || '';
            const lastName = userData.lastName || '';
            const email = userData.email || '';
            const displayName = firstName && lastName 
              ? `${firstName} ${lastName}`.trim() 
              : email || 'User';
            
            // Create the normalized user object with all required fields
            const normalizedUser: AuthUser = {
              id: userData.id,
              email: email,
              firstName: firstName,
              lastName: lastName,
              role: userData.role || 'customer',
              loyaltyPoints: userData.loyaltyPoints || 0,
              name: displayName,
              createdAt: userData.createdAt || new Date().toISOString(),
              orders: userData.orders || [],
            };
            
            setUser(normalizedUser);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(normalizedUser));
            
            console.log('Authentication successful via AuthService, user set:', normalizedUser.email);
            return; // Exit early on success
          } else {
            console.warn('No user data returned from AuthService');
          }
          
          // If AuthService fails and we're not dealing with OAuth cookies, 
          // check if we have stored user data for offline access
          if (!hasAccessToken && !hasRefreshToken) {
            const storedUser = localStorage.getItem('user');
            if (storedUser && hasHttpOnlyAuth()) {
              try {
                const userObj = JSON.parse(storedUser);
                if (userObj && userObj.id && userObj.email) {
                  console.log('Using stored user data with HTTP-only auth detected');
                  setUser(userObj);
                  setIsAuthenticated(true);
                  return;
                }
              } catch (e) {
                console.error('Error parsing stored user data:', e);
              }
            }
            }
            
            // Clear invalid auth data
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          
          // If we have a token but can't reach the server, try to create a minimal user from token
          if (token && token !== 'http-only-cookie-present' && token !== 'user-data-present') {
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              console.log('Token payload for offline fallback:', payload);
              
              if (payload.id && payload.email) {
                const fallbackUser: AuthUser = {
                  id: payload.id,
                  email: payload.email,
                  firstName: payload.firstName || 'User',
                  lastName: payload.lastName || '',
                  role: payload.role || 'customer',
                  loyaltyPoints: 0,
                  name: payload.name || `${payload.firstName || 'User'} ${payload.lastName || ''}`.trim(),
                    createdAt: (payload as any).createdAt || new Date().toISOString(),
                    orders: (payload as any).orders || [],
                };
                
                setUser(fallbackUser);
                setIsAuthenticated(true);
                localStorage.setItem('user', JSON.stringify(fallbackUser));
                
                console.log('Created offline fallback user from token');
                return;
              }
            }
          } catch (tokenError) {
            console.error('Error decoding token for offline fallback:', tokenError);
            }
          }
          
          // Clear any invalid auth data
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    // Listen for authentication state changes from other components
    const handleAuthStateChange = (event: any) => {
      const { isAuthenticated: authStatus, user: userData } = event.detail;
      console.log('Received auth state change event:', { authStatus, userData });
      
      if (authStatus && userData) {
        // Set user data directly from the event
        const normalizedUser: AuthUser = {
          id: userData.id || userData._id || '',
          email: userData.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          role: userData.role || 'customer',
          loyaltyPoints: userData.loyaltyPoints || 0,
          name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'User',
          createdAt: userData.createdAt || new Date().toISOString(),
          orders: userData.orders || [],
        };
        
        setUser(normalizedUser);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        
        // Also update token from the latest source
        const latestToken = getTokenFromAllSources();
        if (latestToken) {
          setToken(latestToken);
        }
        
        console.log('Updated user from auth state change:', normalizedUser.email);
      } else if (authStatus === false) {
        setUser(null);
        setIsAuthenticated(false);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        console.log('Cleared user due to auth state change');
      }
    };

    // Listen for token updates from other parts of the app
    const handleTokenUpdate = (event: any) => {
      const { token: newToken } = event.detail;
      if (newToken) {
        console.log('Received token update event');
        setToken(newToken);
        localStorage.setItem('auth_token', newToken);
        
        // If we have a token but no user, try to fetch user data
        if (!user && !loading) {
          console.log('Have token but no user, attempting to fetch user data');
          checkAuth();
        }
      }
    };
    
    window.addEventListener('auth-state-changed', handleAuthStateChange);
    window.addEventListener('token-updated', handleTokenUpdate);
    
    // Initialize authentication check
    checkAuth();
    
    return () => {
      window.removeEventListener('auth-state-changed', handleAuthStateChange);
      window.removeEventListener('token-updated', handleTokenUpdate);
    };
  }, []); // Run only once on mount

  // Save user data to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      // Ensure isAuthenticated is true whenever we have a user
      if (!isAuthenticated) {
        setIsAuthenticated(true);
      }
    } else {
      localStorage.removeItem('user');
    }
  }, [user, isAuthenticated]);

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
        if (accessToken) {
          setToken(accessToken);
          setIsAuthenticated(true);
        }
        
        toast.success('Registration successful!');
        return true;
      }
      
      toast.error('Registration failed. Please try again.');
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error instanceof Error ? error.message : 'Registration failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AuthService.logout();
      
      // Clear auth state
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      
      // Clear user-specific localStorage items
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('cart');
      localStorage.removeItem('pendingCart'); // Clear pending cart items
      localStorage.removeItem('favorites'); // Clear user favorites
      localStorage.removeItem('access_token'); // Clear any access tokens
      localStorage.removeItem('refresh_token'); // Clear refresh tokens
      localStorage.removeItem('orders'); // Clear user orders data
      localStorage.removeItem('pending_order_id'); // Clear pending order IDs
      localStorage.removeItem('pendingPaymentOrderId'); // Clear pending payment orders
      localStorage.removeItem('stripeSessionId'); // Clear Stripe session
      localStorage.removeItem('currentPaymentOrderId'); // Clear current payment order
      
      // Keep table/venue context for continued browsing:
      // - currentTableId, pendingTableId (table context)
      // - currentVenueId (venue context) 
      // - tableInfo (table information)
      // - device_id (for guest access if needed)
      
      // Clear cookies by setting expiration to past date
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Notify other components about the authentication state change
      window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isAuthenticated: false } }));
      
      // Dispatch cart clear event
      window.dispatchEvent(new CustomEvent('cart-cleared'));
      
      // Dispatch favorites clear event
      window.dispatchEvent(new CustomEvent('favorites-cleared'));
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
    }
  };

  const googleLogin = (): void => {
    // Store current table ID before redirecting
    const currentTableId = localStorage.getItem('currentTableId') || 
                          localStorage.getItem('tableId') || 
                          new URLSearchParams(window.location.search).get('table');
    
    if (currentTableId) {
      sessionStorage.setItem('tableId', currentTableId);
      console.log('Stored table ID before Google login:', currentTableId);
    }

    // Use customer auth service for Google OAuth
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
      console.log('Attempting guest login...');
      
      // Create a device ID if not already stored
      const deviceId = localStorage.getItem('device_id') || `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      if (!localStorage.getItem('device_id')) {
        localStorage.setItem('device_id', deviceId);
      }
      
      // Get current table ID from various sources
      const effectiveTableId = tableId || 
                              localStorage.getItem('currentTableId') || 
                              localStorage.getItem('tableId') || 
                              new URLSearchParams(window.location.search).get('table') || 
                              '';
      
      console.log('Guest login with tableId:', effectiveTableId);
      
      // Use AuthService guest login
      const response = await AuthService.guestLogin(effectiveTableId);
      
      if (response.success && response.token) {
        // Set token in cookie and localStorage for cross-page consistency
        localStorage.setItem('auth_token', response.token);
        document.cookie = `auth_token=${response.token}; path=/; max-age=86400; SameSite=Lax`;
        
        // Create a minimal user object
        const guestUser: AuthUser = {
          id: response.user?.id || deviceId,
          email: 'guest@inseat.app',
          firstName: 'Guest',
          lastName: 'User',
          role: 'guest',
          loyaltyPoints: 0,
          name: 'Guest User',
          createdAt: new Date().toISOString(),
          orders: [],
        };
        
        setUser(guestUser);
        setToken(response.token);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(guestUser));
        
        console.log('Guest login successful');
        toast.success('Welcome! You can now browse the menu and place orders.');
        return true;
      }
      
      console.error('Guest login failed:', response);
      toast.error('Failed to initialize guest session. Please try again.');
      return false;
    } catch (error) {
      console.error('Guest login error:', error);
      toast.error('Failed to initialize guest session. Please try again.');
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
          
          // Update the user object with the data from /api/auth/me
          if (userData.user) {
            // Create a proper user object from the API response
            const userObj: AuthUser = {
              id: userData.user.id || userData.user._id || '',
              email: userData.user.email || '',
              firstName: userData.user.firstName || '',
              lastName: userData.user.lastName || '',
              role: userData.user.role || 'customer',
              loyaltyPoints: userData.user.loyaltyPoints || 0,
              name: userData.user.name || `${userData.user.firstName || ''} ${userData.user.lastName || ''}`.trim() || userData.user.email || '',
              createdAt: userData.user.createdAt?.toString() || new Date().toISOString(),
              orders: userData.user.orders || []
            };
            
            console.log('Setting user data from /auth/me:', userObj);
            setUser(userObj);
          }
          
          // If we got a token in the response, save it
          if (userData.token) {
            console.log('Got new token from user data after refresh');
            setToken(userData.token);
            // Only using cookies for token storage, not localStorage
            
            // Set token in cookie for cross-page consistency
            document.cookie = `auth_token=${userData.token}; path=/; max-age=86400; SameSite=Lax`;
          }
          
          return true;
        }
      }
      
      console.log('Token refresh failed');
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
    } else {
      setUser(userData as AuthUser);
    }
    // Ensure isAuthenticated is set to true when updating user data
    setIsAuthenticated(true);
  };

  const addLoyaltyPoints = (points: number) => {
    if (user) {
      const updatedUser = {
        ...user,
        loyaltyPoints: (user.loyaltyPoints || 0) + points
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success(`Added ${points} loyalty points!`);
    }
  };

  const customerLogin = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      const response = await customerAuthService.login({ email, password });
      
      if (response.success && response.user) {
        // Transform the user object to match our frontend expectations
        const userData: AuthUser = {
          id: response.user.id || (response.user as any)._id || '',
          email: response.user.email || '',
          firstName: response.user.firstName || '',
          lastName: response.user.lastName || '',
          role: 'customer',
          loyaltyPoints: response.user.loyaltyPoints || 0,
          name: `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim() || response.user.email || '',
          createdAt: (response.user as any).createdAt?.toString() || new Date().toISOString(),
          orders: (response.user as any).orders || [],
        };
        
        setUser(userData);
        
        // Get token from cookies after login
        const accessToken = getTokenFromAllSources();
        if (accessToken) {
          setToken(accessToken);
          setIsAuthenticated(true);
        }
        
        toast.success('Login successful!');
        return true;
      }
      
      toast.error('Invalid email or password');
      return false;
    } catch (error) {
      console.error('Customer login error:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const customerSignup = async (firstName: string, lastName: string, email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      // Get tableId from localStorage if available
      const tableId = localStorage.getItem('currentTableId') || 
                     localStorage.getItem('tableId') || 
                     sessionStorage.getItem('tableId') || 
                     undefined;
      
      // Also check URL parameters as fallback
      let finalTableId = tableId;
      if (!finalTableId) {
        const urlParams = new URLSearchParams(window.location.search);
        finalTableId = urlParams.get('table') || undefined;
      }
      
      const registrationData = {
        firstName,
        lastName,
        email,
        password,
        ...(finalTableId && { tableId: finalTableId })
      };
      
      console.log('Customer signup with context:', {
        ...registrationData,
        password: '[REDACTED]',
        tableId: finalTableId || 'Not provided'
      });
      
      const response = await customerAuthService.register(registrationData);
      
      if (response.success && response.user) {
        // Transform the user object to match our frontend expectations
        const userData: AuthUser = {
          id: response.user.id || (response.user as any)._id || '',
          email: response.user.email || '',
          firstName: response.user.firstName || '',
          lastName: response.user.lastName || '',
          role: 'customer',
          loyaltyPoints: response.user.loyaltyPoints || 0,
          name: `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim() || response.user.email || '',
          createdAt: (response.user as any).createdAt?.toString() || new Date().toISOString(),
          orders: (response.user as any).orders || [],
        };
        
        setUser(userData);
        
        // Get token from cookies after signup
        const accessToken = getTokenFromAllSources();
        if (accessToken) {
          setToken(accessToken);
          setIsAuthenticated(true);
        }
        
        toast.success('Registration successful!');
        return true;
      }
      
      toast.error('Registration failed. Please try again.');
      return false;
    } catch (error) {
      console.error('Customer signup error:', error);
      
      toast.error('An error occurred during registration. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  const customerGoogleLogin = () => {
    // Store current table ID before redirecting
    const currentTableId = localStorage.getItem('currentTableId') || 
                          localStorage.getItem('tableId') || 
                          new URLSearchParams(window.location.search).get('table');
    
    if (currentTableId) {
      sessionStorage.setItem('tableId', currentTableId);
      console.log('Stored table ID before customer Google login:', currentTableId);
    }

    const baseUrl = import.meta.env.VITE_AUTH_API_URL?.split('/api/auth')[0] || import.meta.env.VITE_API_BASE_URL || 'https://api.inseat.achievengine.com';
    let googleAuthUrl = `${baseUrl}/api/auth/google`;
    
    // Add table ID to URL if available
    if (currentTableId) {
      googleAuthUrl += `?table=${encodeURIComponent(currentTableId)}`;
    }
    
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
        refreshToken,
        setIsAuthenticated
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Create a custom hook to use the auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export all components and hooks from a single location
export { AuthContext, AuthProvider, useAuth };
