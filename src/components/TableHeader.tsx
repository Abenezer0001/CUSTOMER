
import React from 'react';
import { useTableInfo } from '@/context/TableContext';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';

export const TableHeader: React.FC = () => {
  const { restaurantName, tableNumber } = useTableInfo();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[url('/lovable-uploads/67359cb5-4e87-412a-a754-ae25100c8b48.png')] bg-cover bg-center">
      <div className="flex justify-between items-center px-4 py-2 bg-emerald-600/90 backdrop-blur-sm text-white">
        <div>
          <h1 className="text-base font-medium">{restaurantName || 'InSeat'}</h1>
        </div>
        
        <div className="flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-sm font-medium">TABLE {tableNumber || 'L01'}</span>
        </div>
        
        <Link to="/login" className="flex items-center gap-1 text-white">
          <User size={16} />
          <span className="text-xs hidden sm:inline">Login</span>
        </Link>
      </div>
    </header>
  );
};
