import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTableInfo } from '@/context/TableContext';
import { toast } from 'sonner';

const LoginSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { tableId } = useTableInfo();
  
  useEffect(() => {
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
    console.log('Effective table ID for redirection:', effectiveTableId);
    
    // Check if there's a pending cart to recover
    const pendingCartJson = localStorage.getItem('pendingCart');
    
    // Redirect with a slight delay for better UX
    const timer = setTimeout(() => {
      if (pendingCartJson) {
        try {
          // Parse the pending cart data
          const pendingCart = JSON.parse(pendingCartJson);
          
          // Clear the pending cart from localStorage
          localStorage.removeItem('pendingCart');
          
          // Store the table ID in localStorage to ensure it's available
          if (effectiveTableId) {
            localStorage.setItem('currentTableId', effectiveTableId);
          }
          
          // Redirect to menu page instead of cart
          if (effectiveTableId) {
            navigate(`/?table=${effectiveTableId}`);
          } else {
            navigate('/');
          }
          
          // Display message about successful login
          toast.success('Login successful! Your cart has been recovered.');
          console.log('Redirecting to menu page after login');
        } catch (error) {
          console.error('Error parsing pending cart:', error);
          if (effectiveTableId) {
            navigate(`/?table=${effectiveTableId}`);
          } else {
            navigate('/');
          }
        }
      } else {
        // No pending cart, redirect to menu with table ID
        if (effectiveTableId) {
          console.log(`Table ID found: ${effectiveTableId}, redirecting to menu`);
          navigate(`/?table=${effectiveTableId}`);
        } else {
          // No table ID found, redirect to home page
          console.log('No table ID found, redirecting to home page');
          navigate('/');
        }
      }
    }, 1000);

    // Clean up the timer
    return () => clearTimeout(timer);
  }, [navigate, tableId]);

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
        <p className="text-purple-400">Redirecting to menu...</p>
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
