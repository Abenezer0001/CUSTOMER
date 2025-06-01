import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Helper function to check for auth indicators
  const hasAuthIndicators = () => {
    // Check if we're marked as authenticated in context
    if (isAuthenticated) return true;
    
    // Check for auth cookies
    const cookies = document.cookie.split(';');
    const hasAuthCookie = cookies.some(cookie => 
      cookie.trim().startsWith('auth_token=') || 
      cookie.trim().startsWith('access_token=') ||
      cookie.trim().includes('session') ||
      cookie.trim().includes('sid')
    );
    if (hasAuthCookie) return true;
    
    // Check if we have user data indicating previous authentication
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        if (userObj && userObj.id && userObj.email) {
          return true;
        }
      } catch (e) {
        console.error('Error parsing stored user data:', e);
      }
    }
    
    // Check for substantial cookie content that might indicate HTTP-only auth
    const cookieString = document.cookie;
    return cookieString.length > 50;
  };

  useEffect(() => {
    if (!isLoading) {
      // Give the auth context a bit more time to initialize if we have auth indicators
      if (!isAuthenticated && hasAuthIndicators()) {
        console.log('Auth indicators found, waiting a bit for auth context to initialize');
        const timer = setTimeout(() => {
          setHasCheckedAuth(true);
        }, 500); // Reduced from 1000ms to 500ms to prevent long waits
        
        return () => clearTimeout(timer);
      } else {
        setHasCheckedAuth(true);
      }
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (hasCheckedAuth && !isLoading && !isAuthenticated && !hasAuthIndicators()) {
      toast.error('You must be logged in to access this page');
    }
  }, [hasCheckedAuth, isLoading, isAuthenticated]);

  // Still loading auth context
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 dark:border-emerald-400"></div>
      </div>
    );
  }

  // Still checking auth or have auth indicators - show loading
  if (!hasCheckedAuth || (!isAuthenticated && hasAuthIndicators())) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 dark:border-emerald-400"></div>
      </div>
    );
  }

  // No authentication and no indicators - redirect to login
  if (!isAuthenticated) {
    // Save the location the user was trying to visit
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
