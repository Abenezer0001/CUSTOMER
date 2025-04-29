import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import authService from '@/api/authService';

// Define types for authentication
type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  loyaltyPoints: number;
  orders?: string[];
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (firstName: string, lastName: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  googleLogin: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  addLoyaltyPoints: (points: number) => void;
  refreshToken: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on initial render and set up token refresh
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        // Check if we're authenticated with the server
        const isAuthenticated = await authService.checkAuthStatus();
        
        if (isAuthenticated) {
          // Fetch current user data from the server
          const response = await authService.getCurrentUser();
          if (response.success && response.user) {
            // Transform the user object to match our frontend expectations
            const userData: AuthUser = {
              id: response.user.id,
              email: response.user.email,
              firstName: response.user.firstName,
              lastName: response.user.lastName,
              role: response.user.role,
              loyaltyPoints: response.user.loyaltyPoints || 0,
            };
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } else {
          // Try to load from localStorage as fallback
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
              // Try to refresh the token with existing credentials
              await refreshToken();
            } catch (error) {
              console.error('Error parsing stored user data:', error);
              localStorage.removeItem('user');
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Set up token refresh interval (every 10 minutes)
    const refreshInterval = setInterval(() => {
      if (user) {
        refreshToken();
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(refreshInterval);
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
    setIsLoading(true);
    
    try {
      const response = await authService.login({ email, password });
      
      if (response.success && response.user) {
        // Transform the user object to match our frontend expectations
        const userData: AuthUser = {
          id: response.user.id,
          email: response.user.email,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          role: response.user.role,
          loyaltyPoints: response.user.loyaltyPoints || 0,
        };
        
        setUser(userData);
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
      setIsLoading(false);
    }
  };

  const signup = async (firstName: string, lastName: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const response = await authService.register({
        firstName,
        lastName,
        email,
        password
      });
      
      if (response.success && response.user) {
        // Transform the user object to match our frontend expectations
        const userData: AuthUser = {
          id: response.user.id,
          email: response.user.email,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          role: response.user.role,
          loyaltyPoints: response.user.loyaltyPoints || 0,
        };
        
        setUser(userData);
        toast.success('Account created successfully!');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error instanceof Error ? error.message : 'Signup failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      toast.info('You have been logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = (): void => {
    // Redirect to Google auth URL
    window.location.href = authService.getGoogleAuthUrl();
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const success = await authService.refreshToken();
      if (!success && user) {
        // If refresh fails, log the user out locally
        setUser(null);
        toast.error('Your session has expired. Please login again.');
      }
      return success;
    } catch (error) {
      console.error('Token refresh error:', error);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        googleLogin,
        updateUser,
        addLoyaltyPoints,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
