
import React from 'react';
import { Outlet } from 'react-router-dom';
import { TableHeader } from '@/components/TableHeader';
import { BottomNav } from '@/components/BottomNav';
import { useTableInfo } from '@/context/TableContext';

const Layout: React.FC = () => {
  const { tableNumber } = useTableInfo();
  
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <TableHeader />
      <main className="flex-grow pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
