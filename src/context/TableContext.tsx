
import React, { createContext, useContext, useState, useEffect } from 'react';
import { TableInfo } from '@/types';

type TableContextType = TableInfo & {
  setTableInfo: (tableInfo: TableInfo | ((prev: TableInfo) => TableInfo)) => void;
};

const TableContext = createContext<TableContextType | undefined>(undefined);

export const TableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tableInfo, setTableInfo] = useState<TableInfo>(() => {
    const savedTableInfo = localStorage.getItem('tableInfo');
    return savedTableInfo 
      ? JSON.parse(savedTableInfo) 
      : { tableNumber: 'L01', restaurantName: 'InSeat' };
  });

  useEffect(() => {
    localStorage.setItem('tableInfo', JSON.stringify(tableInfo));
  }, [tableInfo]);

  return (
    <TableContext.Provider
      value={{
        ...tableInfo,
        setTableInfo,
      }}
    >
      {children}
    </TableContext.Provider>
  );
};

export const useTableInfo = () => {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error('useTableInfo must be used within a TableProvider');
  }
  return context;
};
