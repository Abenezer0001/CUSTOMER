
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { fetchWithFallback } from '@/utils/dataFetcher';

// Define types for authentication
type AuthUser = {
  id: string;
  email: string;
  name: string;
  loyaltyPoints: number;
  orders: string[];
  createdAt: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  googleLogin: () => Promise<boolean>;
  updateUser: (userData: Partial<AuthUser>) => void;
  addLoyaltyPoints: (points: number) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from localStorage on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  // Save user data to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Try API login first
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        toast.success('Login successful!');
        setIsLoading(false);
        return true;
      }
      
      // If API fails, try JSON fallback
      const { data: users, isFallback } = await fetchWithFallback<AuthUser[]>(
        'http://localhost:3000/api/users',
        { fallbackPath: '/src/data/users/users.json' }
      );
      
      const foundUser = users.find(u => 
        u.email.toLowerCase() === email.toLowerCase() // Simple email check for fallback
        // In a real app, you'd need to hash the password and compare
      );
      
      if (foundUser) {
        setUser(foundUser);
        if (isFallback) {
          toast.warning('Using local data. Some features may be limited.');
        } else {
          toast.success('Login successful!');
        }
        setIsLoading(false);
        return true;
      }
      
      toast.error('Invalid email or password');
      setIsLoading(false);
      return false;
      
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Check if user already exists in local storage first
      const { data: existingUsers, isFallback } = await fetchWithFallback<AuthUser[]>(
        'http://localhost:3000/api/users',
        { fallbackPath: '/src/data/users/users.json' }
      );
      
      if (existingUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        toast.error('Email already in use');
        setIsLoading(false);
        return false;
      }
      
      // Try API signup first
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        toast.success('Account created successfully!');
        setIsLoading(false);
        return true;
      }
      
      // If API fails, save to local JSON
      const newUser: AuthUser = {
        id: `user_${Date.now()}`,
        email,
        name,
        loyaltyPoints: 100, // Welcome bonus
        orders: [],
        createdAt: new Date().toISOString()
      };
      
      // In a real app, you'd hash the password before storing it
      
      // Add user to local JSON
      const updatedUsers = [...existingUsers, newUser];
      
      try {
        // In a browser environment, we can't directly write to the file
        // This is a simulated action that would be handled by the backend
        localStorage.setItem('simulated_users_data', JSON.stringify(updatedUsers));
        
        setUser(newUser);
        toast.success('Account created locally. Some features may be limited.');
        setIsLoading(false);
        return true;
      } catch (saveError) {
        console.error('Error saving user data:', saveError);
        toast.error('Failed to create account');
        setIsLoading(false);
        return false;
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Signup failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    toast.info('You have been logged out');
  };

  const googleLogin = async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // In a real implementation, this would redirect to Google OAuth
      // For this demo, we'll simulate a successful Google login
      
      // Create a mock user for demo purposes
      const googleUser: AuthUser = {
        id: `google_user_${Date.now()}`,
        email: `user_${Date.now()}@gmail.com`,
        name: 'Google User',
        loyaltyPoints: 100, // Welcome bonus
        orders: [],
        createdAt: new Date().toISOString()
      };
      
      setUser(googleUser);
      toast.success('Google sign-in successful!');
      setIsLoading(false);
      return true;
      
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Google sign-in failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  const updateUser = (userData: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
    }
  };

  const addLoyaltyPoints = (points: number) => {
    if (user) {
      const updatedUser = {
        ...user,
        loyaltyPoints: (user.loyaltyPoints || 0) + points
      };
      setUser(updatedUser);
      toast.success(`You earned ${points} loyalty points!`);
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
        addLoyaltyPoints
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
