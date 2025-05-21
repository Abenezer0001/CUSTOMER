import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTableInfo } from '@/context/TableContext';

const LoginSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { tableId } = useTableInfo();
  
  useEffect(() => {
    // Redirect to menu page after 1 second
    const timer = setTimeout(() => {
      navigate(`/?table=${tableId}`);
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
      <style jsx>{`
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
