import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  const { isAuthenticated, isLoading, token } = useAuth();
  const location = useLocation();

  // Helper function to check if user has any valid token
  const hasValidToken = (): boolean => {
    // Check for token in context
    if (token) return true;
    
    // Check localStorage
    const localToken = localStorage.getItem('auth_token');
    if (localToken) return true;
    
    // Check cookies for auth tokens
    try {
      const cookies = document.cookie.split(';');
      const hasAuthToken = cookies.some(cookie => 
        cookie.trim().startsWith('auth_token=') || 
        cookie.trim().startsWith('access_token=')
      );
      if (hasAuthToken) return true;
    } catch (error) {
      console.error('Error checking cookies:', error);
    }
    
    return false;
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16141F] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated and has no valid token
  if (requireAuth && !isAuthenticated && !hasValidToken()) {
    console.log('ProtectedRoute: No authentication found, redirecting to login');
    // Redirect to login page, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated or auth is not required, render children
  return <>{children}</>;
};

export default ProtectedRoute;
