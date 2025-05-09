
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate, UNSAFE_NavigationContext } from 'react-router-dom';
import { TableInfo } from '@/types';

type SetTableInfoAction = TableInfo | ((prev: TableInfo) => TableInfo);

type TableContextType = TableInfo & {
  setTableInfo: (tableInfo: SetTableInfoAction) => void;
};

const TableContext = createContext<TableContextType | undefined>(undefined);

export const TableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if we're in a router context before using router hooks
  const navigation = React.useContext(UNSAFE_NavigationContext);
  const inRouterContext = navigation !== null;
  
  // Only use router hooks if we're in a router context
  const params = inRouterContext ? useParams<{ tableId: string }>() : { tableId: undefined };
  const { tableId } = params;
  
  // Safe navigation function that only uses navigate when available
  const safeNavigate = React.useCallback((path: string) => {
    if (inRouterContext) {
      const navigate = useNavigate();
      navigate(path);
    } else {
      console.warn('Navigation attempted outside Router context');
    }
  }, [inRouterContext]);
  
  // Initialize with saved data or defaults
  const [tableInfo, setTableInfo] = useState<TableInfo>(() => {
    const savedTableInfo = localStorage.getItem('tableInfo');
    return savedTableInfo 
      ? JSON.parse(savedTableInfo) 
      : { tableNumber: tableId || 'L01', restaurantName: 'InSeat', tableId: tableId || '' };
  });

  // Update table info from URL parameter when it changes
  useEffect(() => {
    if (tableId && tableId !== tableInfo.tableId) {
      // When URL tableId changes, update the context
      setTableInfo(prev => ({
        ...prev,
        tableId,
        tableNumber: tableId // Use tableId as tableNumber if no better info available
      }));

      // Here you would fetch venue info or other table details based on the table ID
      // Example: fetchTableDetails(tableId);
    }
  }, [tableId]);

  // Save table info to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('tableInfo', JSON.stringify(tableInfo));
  }, [tableInfo]);

  // Helper function to update table info
  const updateTableInfo = (tableInfoOrFunction: SetTableInfoAction) => {
    if (typeof tableInfoOrFunction === 'function') {
      setTableInfo(prev => {
        const newTableInfo = tableInfoOrFunction(prev);
        
        // If tableId changes in the context, update the URL
        if (newTableInfo.tableId && newTableInfo.tableId !== prev.tableId && inRouterContext) {
          safeNavigate(`/${newTableInfo.tableId}`);
        }
        
        return newTableInfo;
      });
    } else {
      // If tableId changes, update the URL
      if (tableInfoOrFunction.tableId && tableInfoOrFunction.tableId !== tableInfo.tableId && inRouterContext) {
        safeNavigate(`/${tableInfoOrFunction.tableId}`);
      }
      
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
