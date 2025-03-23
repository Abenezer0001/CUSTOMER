
import React from 'react';
import { useTableInfo } from '@/context/TableContext';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';

export const TableHeader: React.FC = () => {
  const { restaurantName, tableNumber } = useTableInfo();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[url('/lovable-uploads/67359cb5-4e87-412a-a754-ae25100c8b48.png')] bg-cover bg-center">
      <div className="flex justify-between items-center px-4 py-3 bg-black/40 backdrop-blur-sm text-white">
        <div>
          <h1 className="text-xl font-bold">{restaurantName || 'InSeat'}</h1>
        </div>
        
        <div className="flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-1">
          <span className="text-lg font-bold">TABLE {tableNumber || 'L01'}</span>
        </div>
        
        <Link to="/login" className="flex items-center gap-1 text-white">
          <User size={18} />
          <span className="text-sm hidden sm:inline">Login</span>
        </Link>
      </div>
    </header>
  );
};
