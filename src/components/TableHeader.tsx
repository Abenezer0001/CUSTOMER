
import React, { useEffect } from 'react';
import { useTableInfo } from '@/context/TableContext';
import { Link, useLocation } from 'react-router-dom';
import { User } from 'lucide-react';

export const TableHeader: React.FC = () => {
  const { restaurantName, tableNumber, setTableInfo } = useTableInfo();
  const location = useLocation();
  
  useEffect(() => {
    // Extract table number from URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const tableParam = queryParams.get('table');
    
    if (tableParam) {
      // If table parameter exists in URL, use it
      setTableInfo({
        tableNumber: tableParam,
        restaurantName: restaurantName
      });
    } else if (!tableNumber) {
      // If no table number set yet, generate a random one
      const randomTable = generateRandomTableNumber();
      setTableInfo({
        tableNumber: randomTable,
        restaurantName: restaurantName
      });
    }
  }, [location.search, setTableInfo, restaurantName, tableNumber]);
  
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[url('/lovable-uploads/67359cb5-4e87-412a-a754-ae25100c8b48.png')] bg-cover bg-center">
      <div className="flex justify-between items-center px-4 py-2 bg-emerald-600/90 backdrop-blur-sm text-white">
        <div>
          <h1 className="text-sm font-medium">{restaurantName || 'InSeat'}</h1>
        </div>
        
        <div className="flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-xs font-semibold tracking-wider">TABLE {tableNumber}</span>
        </div>
        
        <Link to="/login" className="flex items-center gap-1 text-white">
          <User size={14} />
          <span className="text-xs hidden sm:inline">Login</span>
        </Link>
      </div>
    </header>
  );
};
