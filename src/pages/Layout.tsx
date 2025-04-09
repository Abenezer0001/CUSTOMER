
import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TableHeader } from '@/components/TableHeader';
import { BottomNav } from '@/components/BottomNav';
import { useTableInfo } from '@/context/TableContext';
import { useTheme } from 'next-themes';

const Layout: React.FC = () => {
  const { tableNumber, setTableInfo } = useTableInfo();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  
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
    } else {
      // Check if we need to generate a random table number
      const storedTable = localStorage.getItem('tableInfo');
      if (!storedTable || !JSON.parse(storedTable).tableNumber) {
        const randomTable = generateRandomTableNumber();
        setTableInfo(prev => ({
          ...prev,
          tableNumber: randomTable
        }));
      }
    }
  }, [location.search, setTableInfo]);
  
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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-background">
      <TableHeader />
      {/* Set main content background to white and ensure dark text in dark mode */}
      <main className="flex-grow pb-20"> {/* Removed bg-white and dark:text-gray-800 */}
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
