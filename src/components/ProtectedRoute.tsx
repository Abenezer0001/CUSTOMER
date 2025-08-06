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

  // Helper function to check if user has any valid token or session data
  const hasValidToken = (): boolean => {
    // Check for token in context
    if (token) {
      console.log('ProtectedRoute: Found token in context');
      return true;
    }
    
    // Check localStorage for tokens (multiple possible keys)
    const possibleTokenKeys = ['auth_token', 'access_token', 'authToken', 'token'];
    for (const key of possibleTokenKeys) {
      const localToken = localStorage.getItem(key);
      if (localToken) {
        console.log(`ProtectedRoute: Found token in localStorage key: ${key}`);
        return true;
      }
    }
    
    // Check sessionStorage for tokens
    for (const key of possibleTokenKeys) {
      const sessionToken = sessionStorage.getItem(key);
      if (sessionToken) {
        console.log(`ProtectedRoute: Found token in sessionStorage key: ${key}`);
        return true;
      }
    }
    
    // Check for stored user data (indicates successful auth)
    try {
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData && userData.id && userData.email) {
          console.log('ProtectedRoute: Found valid stored user data');
          return true;
        }
      }
    } catch (error) {
      console.error('Error checking stored user:', error);
    }
    
    // Check cookies for auth tokens  
    try {
      const cookies = document.cookie.split(';');
      const hasAuthToken = cookies.some(cookie => 
        cookie.trim().startsWith('auth_token=') || 
        cookie.trim().startsWith('access_token=') ||
        cookie.trim().startsWith('refresh_token=') ||
        cookie.trim().startsWith('session_token=')
      );
      if (hasAuthToken) {
        console.log('ProtectedRoute: Found auth token in cookies');
        return true;
      }
    } catch (error) {
      console.error('Error checking cookies:', error);
    }
    
    console.log('ProtectedRoute: No valid tokens found in any location');
    return false;
  };

  // Show loading while checking authentication - be more patient on initial load
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16141F] flex items-center justify-center">
        <div className="text-white flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated and has no valid token
  if (requireAuth && !isAuthenticated && !hasValidToken()) {
    // Enhanced Stripe return detection with comprehensive checks
    const urlParams = new URLSearchParams(location.search);
    const isReturningFromStripe = 
      location.search.includes('return_from_stripe=true') || 
      location.pathname.includes('/payment/') ||
      location.pathname.includes('/success') ||
      location.pathname.includes('/cancel') ||
      urlParams.get('source') === 'stripe' ||
      document.referrer.includes('stripe.com') ||
      document.referrer.includes('checkout.stripe.com') ||
      // Check session storage for Stripe session
      sessionStorage.getItem('stripe_checkout_session') ||
      localStorage.getItem('stripeSessionId');
    
    if (isReturningFromStripe) {
      console.log('ProtectedRoute: Detecting Stripe return, attempting immediate auth restoration');
      
      // IMMEDIATE auth restoration - check all possible token sources
      const possibleTokens = [
        localStorage.getItem('auth_token'),
        localStorage.getItem('access_token'),
        localStorage.getItem('authToken'),
        sessionStorage.getItem('auth_token'),
        sessionStorage.getItem('access_token')
      ].filter(Boolean);
      
      const possibleUserData = [
        localStorage.getItem('user'),
        sessionStorage.getItem('user')
      ].filter(Boolean);
      
      console.log('ProtectedRoute: Found auth data:', {
        tokens: possibleTokens.length,
        userData: possibleUserData.length,
        hasAnyAuth: possibleTokens.length > 0 && possibleUserData.length > 0
      });
      
      // If we have auth data, trigger immediate restoration
      if (possibleTokens.length > 0 && possibleUserData.length > 0) {
        console.log('ProtectedRoute: Auth data found, triggering immediate restoration');
        
        // Force immediate auth context update
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('auth-restore', { 
            detail: { 
              source: 'protected-route-stripe-return',
              token: possibleTokens[0],
              userData: possibleUserData[0]
            }
          }));
        }, 50);
        
        // Give auth context time to update, then force re-render
        setTimeout(() => {
          window.location.replace(location.pathname + location.search);
        }, 1500);
        
        return (
          <div className="min-h-screen bg-[#16141F] flex items-center justify-center">
            <div className="text-white flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
              <div>Restoring your session...</div>
            </div>
          </div>
        );
      }
    }
    
    console.log('ProtectedRoute: No authentication found, redirecting to login');
    // Redirect to login page, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated or auth is not required, render children
  return <>{children}</>;
};

export default ProtectedRoute;
