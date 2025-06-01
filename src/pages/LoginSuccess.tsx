import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTableInfo } from '@/context/TableContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { AuthService } from '@/services/AuthService';

const LoginSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { tableId } = useTableInfo();
  const { updateUser, setIsAuthenticated } = useAuth();
  const hasProcessed = useRef(false); // Prevent multiple runs
  
  useEffect(() => {
    // Prevent multiple execution
    if (hasProcessed.current) {
      console.log('LoginSuccess: Already processed, skipping...');
      return;
    }
    
    hasProcessed.current = true;
    
    const handleGoogleAuthSuccess = async () => {
      try {
        console.log('LoginSuccess: Handling Google OAuth success');
        
        // Check for auth cookies that should have been set by the backend
        const cookies = document.cookie.split(';');
        const hasAccessToken = cookies.some(cookie => cookie.trim().startsWith('access_token='));
        const hasAuthToken = cookies.some(cookie => cookie.trim().startsWith('auth_token='));
        
        console.log('LoginSuccess: Auth cookies present:', { hasAccessToken, hasAuthToken });
        console.log('LoginSuccess: All cookies:', document.cookie);
        
        // Even if no cookies are detected in frontend, try to fetch user data
        // because the backend might have set HTTP-only cookies that we can't read
        console.log('LoginSuccess: Attempting to fetch user data from backend...');
        
        try {
          // Use the AuthService that's properly configured with the backend URL
          const userData = await AuthService.getCurrentUser();
          console.log('LoginSuccess: AuthService response:', userData);
          
          if (userData && userData.id && userData.email) {
            // Create normalized user object
            const normalizedUserData = {
              id: userData.id,
              email: userData.email,
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              role: userData.role || 'customer',
              loyaltyPoints: userData.loyaltyPoints || 0,
              name: userData.firstName && userData.lastName 
                ? `${userData.firstName} ${userData.lastName}`.trim() 
                : userData.email,
              createdAt: userData.createdAt || new Date().toISOString(),
              orders: userData.orders || []
            };
            
            console.log('LoginSuccess: Setting user data:', normalizedUserData);
            
            // Update user in auth context
            updateUser(normalizedUserData);
            setIsAuthenticated(true);
            
            toast.success('Login successful!');
            
            // Proceed with navigation
            handleNavigationLogic();
            return;
          } else {
            console.error('LoginSuccess: No user data returned from backend');
            toast.error('Failed to load user data. Please try logging in again.');
            
            // Redirect to login on error
            setTimeout(() => {
              navigate('/login', { replace: true });
            }, 2000);
            return;
          }
        } catch (fetchError) {
          console.error('LoginSuccess: Failed to fetch user data from AuthService:', fetchError);
          toast.error('Failed to load user data. Please try logging in again.');
          
          // Redirect to login on error
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }
        
      } catch (error) {
        console.error('LoginSuccess: Error handling Google auth success:', error);
        toast.error('Authentication error. Please try logging in again.');
        
        // Redirect to login on error
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }
    };
    
    const handleNavigationLogic = () => {
    // Check for all possible table ID sources
    const getEffectiveTableId = () => {
      // Check all possible sources of table ID
      const currentTableId = localStorage.getItem('currentTableId');
      const simpleTableId = localStorage.getItem('tableId');
      const tableIdFromSession = sessionStorage.getItem('tableId');
      const urlParams = new URLSearchParams(window.location.search);
      const tableIdFromUrl = urlParams.get('table');
      
      // Use the first valid table ID found
      return tableId || currentTableId || simpleTableId || tableIdFromSession || tableIdFromUrl || '';
    };
    
    const effectiveTableId = getEffectiveTableId();
      console.log('LoginSuccess: Effective table ID for redirection:', effectiveTableId);
          
          // Store the table ID in localStorage to ensure it's available
          if (effectiveTableId) {
            localStorage.setItem('currentTableId', effectiveTableId);
          }
          
      // Redirect with a short delay to allow auth processing
      setTimeout(() => {
        if (effectiveTableId) {
          console.log(`LoginSuccess: Table ID found: ${effectiveTableId}, redirecting to menu`);
          navigate(`/?table=${effectiveTableId}`, { replace: true });
        } else {
          // No table ID found, redirect to home page
          console.log('LoginSuccess: No table ID found, redirecting to home page');
          navigate('/', { replace: true });
      }
      }, 500);
    };
    
    // Start the auth success handling with a short delay to ensure cookies are set
    setTimeout(handleGoogleAuthSuccess, 500);
  }, [navigate, tableId, updateUser, setIsAuthenticated]);

  return (
    <div className="min-h-screen bg-[#16141F] flex items-center justify-center">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-4">
          {/* Success checkmark SVG animation */}
          <svg 
            className="w-full h-full" 
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle 
              cx="50" 
              cy="50" 
              r="45" 
              fill="none" 
              stroke="#a855f7" 
              strokeWidth="7.5"
              strokeLinecap="round"
              strokeDasharray="283"
              strokeDashoffset="283"
              style={{
                animation: "circle-draw 0.6s ease-in-out forwards"
              }}
            />
            <path 
              d="M25,50 L45,70 L75,35" 
              fill="none" 
              stroke="#a855f7" 
              strokeWidth="7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="100"
              strokeDashoffset="100"
              style={{
                animation: "checkmark-draw 0.3s ease-in-out forwards 0.6s"
              }}
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Login Successful!</h1>
        <p className="text-purple-400 mb-2">Loading user data...</p>
        <p className="text-sm text-gray-400">Redirecting to menu...</p>
      </div>

      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes circle-draw {
          0% {
            stroke-dashoffset: 283;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes checkmark-draw {
          0% {
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginSuccess;
