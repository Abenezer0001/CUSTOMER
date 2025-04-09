
import React, { useEffect } from 'react';
import { useTableInfo } from '@/context/TableContext';
import { Link, useLocation } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from "next-themes";

export const TableHeader: React.FC = () => {
  const { restaurantName, tableNumber, setTableInfo } = useTableInfo();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  
  useEffect(() => {
    // Extract table number from URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const tableParam = queryParams.get('table');
    
    if (tableParam) {
      // If table parameter exists in URL, use it
      setTableInfo(prev => ({
        ...prev,
        tableNumber: tableParam
      }));
    } else if (!tableNumber) {
      // If no table number set yet, generate a random one
      const randomTable = generateRandomTableNumber();
      setTableInfo(prev => ({
        ...prev,
        tableNumber: randomTable
      }));
    }
  }, [location.search, setTableInfo, tableNumber]);
  
  // Generate a random alphanumeric table number of length 4
  const generateRandomTableNumber = (): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      {/* Use raisin-black for the header background, ensure text is white */}
      <div className="flex justify-between items-center px-4 py-2 bg-raisin-black text-white relative">
        <div>
          <h1 className="text-sm font-medium">{restaurantName || 'InSeat'}</h1>
        </div>
        
        {/* Use delft-blue for table number background and white text */}
        <div className="flex items-center justify-center bg-delft-blue rounded-md px-3 py-1">
          <span className="text-xs font-semibold tracking-wider text-white">TABLE {tableNumber}</span>
        </div>
        
        <Link 
          to={isAuthenticated ? '/account' : '/login'} 
          className="flex items-center gap-1 text-white"
        >
          <User size={16} className="text-white" /> {/* Ensure icon is white */}
          {/* Removed text label for login/account to match image simplicity */}
        </Link>
      </div>
    </header>
  );
};

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
