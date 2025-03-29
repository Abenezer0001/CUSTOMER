
import React, { createContext, useContext, useState, useEffect } from 'react';
import { TableInfo } from '@/types';

type SetTableInfoAction = TableInfo | ((prev: TableInfo) => TableInfo);

type TableContextType = TableInfo & {
  setTableInfo: (tableInfo: SetTableInfoAction) => void;
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

  const updateTableInfo = (tableInfoOrFunction: SetTableInfoAction) => {
    if (typeof tableInfoOrFunction === 'function') {
      setTableInfo(prev => {
        const newTableInfo = tableInfoOrFunction(prev);
        return newTableInfo;
      });
    } else {
      setTableInfo(tableInfoOrFunction);
    }
  };

  return (
    <TableContext.Provider
      value={{
        ...tableInfo,
        setTableInfo: updateTableInfo,
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
