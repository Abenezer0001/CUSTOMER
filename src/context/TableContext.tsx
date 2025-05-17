import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, UNSAFE_NavigationContext } from 'react-router-dom';
import { TableInfo } from '@/types';
import { verifyTableStatus } from '@/api/menuService';

type SetTableInfoAction = TableInfo | ((prev: TableInfo) => TableInfo);

type TableContextType = TableInfo & {
  setTableInfo: (tableInfo: SetTableInfoAction) => void;
  clearTableInfo: () => void;
  isLoadingTable: boolean;
  tableVerified: boolean;
};

const defaultTableInfo: TableInfo = {
  tableNumber: '',
  restaurantName: 'InSeat',
  tableId: ''
};

const TableContext = createContext<TableContextType | undefined>(undefined);

export const TableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if we're in a router context before using router hooks
  const navigation = React.useContext(UNSAFE_NavigationContext);
  const inRouterContext = navigation !== null;
  
  // State for table verification status
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [tableVerified, setTableVerified] = useState(false);
  
  // Ref to track if initial load has happened
  const initialLoadComplete = useRef(false);
  
  // Only use router hooks if we're in a router context
  const params = inRouterContext ? useParams<{ tableId: string }>() : { tableId: undefined };
  const { tableId } = params;
  
  // Get navigate function once
  const navigate = inRouterContext ? useNavigate() : null;
  
  // Safe navigation function that only uses navigate when available
  const safeNavigate = useCallback((path: string) => {
    if (navigate) {
      navigate(path);
    } else {
      console.warn('Navigation attempted outside Router context');
    }
  }, [navigate]);
  
  // Initialize with saved data or defaults
  const [tableInfo, setTableInfo] = useState<TableInfo>(() => {
    // Try to get table ID from URL search params first
    const urlParams = new URLSearchParams(window.location.search);
    const urlTableId = urlParams.get('table');
    
    // If found in URL, use it and store it
    if (urlTableId) {
      const newTableInfo = { 
        tableNumber: urlTableId, 
        restaurantName: 'InSeat', 
        tableId: urlTableId 
      };
      localStorage.setItem('tableInfo', JSON.stringify(newTableInfo));
      return newTableInfo;
    }
    
    // Otherwise check localStorage
    const savedTableInfo = localStorage.getItem('tableInfo');
    if (savedTableInfo) {
      try {
        return JSON.parse(savedTableInfo);
      } catch (e) {
        console.error('Error parsing stored table info:', e);
        localStorage.removeItem('tableInfo');
      }
    }
    
    // Last resort: use from URL params or defaults
    return { 
      tableNumber: tableId || '', 
      restaurantName: 'InSeat', 
      tableId: tableId || '' 
    };
  });

  // Debounced localStorage update function
  const debouncedLocalStorageUpdate = useCallback((data: TableInfo) => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('tableInfo', JSON.stringify(data));
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  // Function to verify table exists
  const verifyTable = useCallback(async (id: string) => {
    if (!id) return false;
    
    try {
      setIsLoadingTable(true);
      console.log(`Verifying table ID: ${id}`);
      const result = await verifyTableStatus(id);
      
      setTableVerified(result.exists);
      
      if (result.exists && result.venue) {
        // Update restaurant name if available
        setTableInfo(prev => ({
          ...prev,
          restaurantName: result.venue?.name || prev.restaurantName
        }));
      }
      
      return result.exists;
    } catch (error) {
      console.error('Error verifying table:', error);
      setTableVerified(false);
      return false;
    } finally {
      setIsLoadingTable(false);
    }
  }, []);

  // Only handle URL parameter during initial mount and explicit URL changes
  useEffect(() => {
    if (!inRouterContext) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlTableId = urlParams.get('table');
    
    // Only update if:
    // 1. There's a table ID in the URL
    // 2. It's different from what we have already
    // 3. We're not already loading a table
    if (urlTableId && urlTableId !== tableInfo.tableId && !isLoadingTable) {
      console.log('URL table ID changed, updating context');
      
      const updatedInfo = {
        ...tableInfo,
        tableId: urlTableId,
        tableNumber: urlTableId
      };
      
      setTableInfo(updatedInfo);
      debouncedLocalStorageUpdate(updatedInfo);
      
      // Verify the table
      verifyTable(urlTableId);
    }
    
    // Mark initial load as complete
    initialLoadComplete.current = true;
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRouterContext, window.location.search]);

  // Clear table info - used when scanning new QR code
  const clearTableInfo = useCallback(() => {
    localStorage.removeItem('tableInfo');
    setTableInfo(defaultTableInfo);
    setTableVerified(false);
  }, []);

  // Helper function to update table info with optimization to prevent unnecessary updates
  const updateTableInfo = useCallback((tableInfoOrFunction: SetTableInfoAction) => {
    let newTableInfo: TableInfo;
    
    if (typeof tableInfoOrFunction === 'function') {
      setTableInfo(prev => {
        newTableInfo = tableInfoOrFunction(prev);
        
        // Only update if something changed
        if (JSON.stringify(newTableInfo) !== JSON.stringify(prev)) {
          // Trigger table verification if table ID changed
          if (newTableInfo.tableId !== prev.tableId) {
            verifyTable(newTableInfo.tableId);
          }
          
          return newTableInfo;
        }
        
        return prev;
      });
    } else {
      // Only update if something changed
      if (JSON.stringify(tableInfoOrFunction) !== JSON.stringify(tableInfo)) {
        newTableInfo = tableInfoOrFunction;
        setTableInfo(newTableInfo);
        
        // Trigger table verification if table ID changed
        if (newTableInfo.tableId !== tableInfo.tableId) {
          verifyTable(newTableInfo.tableId);
        }
      }
    }
  }, [tableInfo, verifyTable]);

  // On initial mount, verify table if we have an ID
  useEffect(() => {
    if (!initialLoadComplete.current && tableInfo.tableId) {
      verifyTable(tableInfo.tableId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TableContext.Provider
      value={{
        ...tableInfo,
        setTableInfo: updateTableInfo,
        clearTableInfo,
        isLoadingTable,
        tableVerified
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
