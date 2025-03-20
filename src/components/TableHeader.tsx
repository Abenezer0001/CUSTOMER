
import React from 'react';
import { useTableInfo } from '@/context/TableContext';

export const TableHeader: React.FC = () => {
  const { restaurantName, tableNumber } = useTableInfo();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[url('/lovable-uploads/357c4052-21e4-4c8d-ba4a-c9962646d47a.png')] bg-cover bg-center">
      <div className="flex justify-between items-center px-4 py-3 bg-black/40 backdrop-blur-sm text-white">
        <div>
          <h1 className="text-xl font-bold">{restaurantName || 'InSeat'}</h1>
        </div>
        <div>
          <span className="text-sm">TABLE</span>
          <p className="text-2xl font-bold">{tableNumber || 'L001'}</p>
        </div>
      </div>
    </header>
  );
};
