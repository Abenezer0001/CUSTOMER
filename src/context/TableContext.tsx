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
  tableId: '',
  restaurantId: undefined
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
  
  // Helper function to ensure values are strings
  const ensureString = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    // If it's an object, return a meaningful string instead of [object Object]
    if (typeof value === 'object') {
      try {
        // If it has an id property, use that
        if (value.id) return value.id;
        // If it has a _id property (MongoDB style), use that
        if (value._id) return value._id;
        // Try to stringify it, but catch any circular references
        const stringified = JSON.stringify(value);
        if (stringified === '{}') return '';
        if (stringified.length < 30) return stringified;
        return '';
      } catch (e) {
        console.error('Error stringifying object:', e);
        return '';
      }
    }
    return String(value);
  };

  // Initialize with saved data or defaults
  const [tableInfo, setTableInfo] = useState<TableInfo>(() => {
    // Try to get table ID from URL search params first
    const urlParams = new URLSearchParams(window.location.search);
    const urlTableId = urlParams.get('table');
    
    // If found in URL, use it and store it
    if (urlTableId) {
      const newTableInfo = { 
        tableNumber: ensureString(urlTableId), 
        restaurantName: 'InSeat', 
        tableId: ensureString(urlTableId),
        restaurantId: undefined
      };
      localStorage.setItem('tableInfo', JSON.stringify(newTableInfo));
      sessionStorage.setItem('tableInfo', JSON.stringify(newTableInfo));
      return newTableInfo;
    }
    
    // Otherwise check localStorage and sessionStorage
    const sessionTableInfo = sessionStorage.getItem('tableInfo');
    const savedTableInfo = localStorage.getItem('tableInfo');
    
    // Try sessionStorage first (more recent)
    if (sessionTableInfo) {
      try {
        const parsed = JSON.parse(sessionTableInfo);
        // Ensure all values are strings
        return {
          tableNumber: ensureString(parsed.tableNumber),
          restaurantName: parsed.restaurantName || 'InSeat',
          tableId: ensureString(parsed.tableId),
          restaurantId: parsed.restaurantId || undefined
        };
      } catch (e) {
        console.error('Error parsing session stored table info:', e);
        sessionStorage.removeItem('tableInfo');
      }
    }
    
    // Then try localStorage
    if (savedTableInfo) {
      try {
        const parsed = JSON.parse(savedTableInfo);
        // Ensure all values are strings
        return {
          tableNumber: ensureString(parsed.tableNumber),
          restaurantName: parsed.restaurantName || 'InSeat',
          tableId: ensureString(parsed.tableId),
          restaurantId: parsed.restaurantId || undefined
        };
      } catch (e) {
        console.error('Error parsing local stored table info:', e);
        localStorage.removeItem('tableInfo');
      }
    }
    
    // Last resort: use from URL params or defaults
    return { 
      tableNumber: ensureString(tableId) || '', 
      restaurantName: 'InSeat', 
      tableId: ensureString(tableId) || '',
      restaurantId: undefined
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
      
      if (result.exists) {
        // Update restaurant info if available
        setTableInfo(prev => ({
          ...prev,
          restaurantName: result.venue?.name || prev.restaurantName,
          restaurantId: result.venue?.restaurantId || result.table?.restaurantId || prev.restaurantId
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

  // Enhanced URL parameter handling for better persistence across redirects
  useEffect(() => {
    if (!inRouterContext) return;
    
    // Check URL parameters first (highest priority)
    const urlParams = new URLSearchParams(window.location.search);
    const urlTableId = urlParams.get('table');
    
    // Check localStorage for saved table information
    const savedTableInfo = localStorage.getItem('tableInfo');
    const parsedSavedInfo = savedTableInfo ? JSON.parse(savedTableInfo) : null;
    
    // Check sessionStorage for even more persistence
    const sessionTableInfo = sessionStorage.getItem('tableInfo');
    const parsedSessionInfo = sessionTableInfo ? JSON.parse(sessionTableInfo) : null;
    
    // Decision logic for which table ID to use
    let effectiveTableId = urlTableId;
    
    // If no table ID in URL but we have one in storage, use that
    if (!effectiveTableId) {
      // First try session storage for most recent value
      if (parsedSessionInfo && parsedSessionInfo.tableId) {
        effectiveTableId = parsedSessionInfo.tableId;
        console.log(`Restoring table ID from sessionStorage: ${effectiveTableId}`);
      }
      // Then try localStorage as fallback
      else if (parsedSavedInfo && parsedSavedInfo.tableId) {
        effectiveTableId = parsedSavedInfo.tableId;
        console.log(`Restoring table ID from localStorage: ${effectiveTableId}`);
      }
    }
    
    // Only update if we have a table ID and it's different from what we have
    if (effectiveTableId && effectiveTableId !== tableInfo.tableId && !isLoadingTable) {
      console.log(`Setting table info from effective source: ${effectiveTableId}`);
      
      const updatedInfo = {
        ...tableInfo,
        tableId: effectiveTableId,
        tableNumber: effectiveTableId,
        restaurantId: tableInfo.restaurantId || undefined
      };
      
      // Set in context
      setTableInfo(updatedInfo);
      
      // Store in both localStorage and sessionStorage for maximum persistence
      localStorage.setItem('tableInfo', JSON.stringify(updatedInfo));
      sessionStorage.setItem('tableInfo', JSON.stringify(updatedInfo));
      
      // Verify the table
      verifyTable(effectiveTableId);
      
      // If we're on a payment success page, redirect back to table page
      if (window.location.pathname.includes('/payment/success') || 
          window.location.pathname.includes('/payment/cancel')) {
        setTimeout(() => {
          safeNavigate(`/table/${effectiveTableId}`);
        }, 1000);
      }
    }
    
    // Mark initial load as complete
    initialLoadComplete.current = true;
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRouterContext, window.location.search, window.location.pathname]);

  // Clear table info - used when scanning new QR code
  const clearTableInfo = useCallback(() => {
    localStorage.removeItem('tableInfo');
    sessionStorage.removeItem('tableInfo');
    setTableInfo(defaultTableInfo);
    setTableVerified(false);
  }, []);

  // Helper function to update table info with optimization to prevent unnecessary updates
  const updateTableInfo = useCallback((tableInfoOrFunction: SetTableInfoAction) => {
    let newTableInfo: TableInfo;
    
    if (typeof tableInfoOrFunction === 'function') {
      setTableInfo(prev => {
        // Get the new table info by calling the function
        const rawNewTableInfo = tableInfoOrFunction(prev);
        
        // Sanitize the values to prevent [object Object]
        newTableInfo = {
          tableNumber: ensureString(rawNewTableInfo.tableNumber),
          restaurantName: rawNewTableInfo.restaurantName || 'InSeat',
          tableId: ensureString(rawNewTableInfo.tableId),
          restaurantId: rawNewTableInfo.restaurantId || undefined
        };
        
        // Only update if something changed
        if (JSON.stringify(newTableInfo) !== JSON.stringify(prev)) {
          // Trigger table verification if table ID changed
          if (newTableInfo.tableId !== prev.tableId) {
            verifyTable(newTableInfo.tableId);
          }
          
          // Store in both localStorage and sessionStorage
          localStorage.setItem('tableInfo', JSON.stringify(newTableInfo));
          sessionStorage.setItem('tableInfo', JSON.stringify(newTableInfo));
          
          return newTableInfo;
        }
        
        return prev;
      });
    } else {
      // Sanitize the direct object values
      const sanitizedTableInfo = {
        tableNumber: ensureString(tableInfoOrFunction.tableNumber),
        restaurantName: tableInfoOrFunction.restaurantName || 'InSeat',
        tableId: ensureString(tableInfoOrFunction.tableId),
        restaurantId: tableInfoOrFunction.restaurantId || undefined
      };
      
      // Only update if something changed
      if (JSON.stringify(sanitizedTableInfo) !== JSON.stringify(tableInfo)) {
        newTableInfo = sanitizedTableInfo;
        setTableInfo(newTableInfo);
        
        // Store in both localStorage and sessionStorage
        localStorage.setItem('tableInfo', JSON.stringify(newTableInfo));
        sessionStorage.setItem('tableInfo', JSON.stringify(newTableInfo));
        
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
