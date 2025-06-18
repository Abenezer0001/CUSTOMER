import React, { useEffect, useState, useCallback } from 'react';
import { useTableInfo } from '@/context/TableContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';
import { AuthService } from '@/services/AuthService';
import customerAuthService from '@/api/customerAuthService';
import { useCart } from '@/context/CartContext';

interface TableHeaderProps {
  venueName?: string;
  tableName?: string;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ 
  venueName, 
  tableName,
  className
}) => {
  const { restaurantName, tableNumber, tableId, setTableInfo, clearTableInfo } = useTableInfo();
  const location = useLocation();
  const navigate = useNavigate();
  // Use all relevant auth context properties and methods
  const { isAuthenticated, refreshToken } = useAuth();

  const { clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  
  // Create a debounced version of setTableInfo to avoid rapid consecutive updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetTableInfo = useCallback(
    debounce((info) => {
      setTableInfo(info);
      // Store in localStorage after debounce
      localStorage.setItem('tableInfo', JSON.stringify(info));
      localStorage.setItem('currentTableId', info.tableId);
      localStorage.setItem('currentVenueId', info.restaurantName);
      setIsLoading(false);
    }, 300),
    [setTableInfo]
  );
  
  useEffect(() => {
    // Skip this effect if tableName is provided via props (controlled component mode)
    if (tableName) {
      return;
    }
    
    // Extract table ID from URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const tableParam = queryParams.get('table');
    
    // Only process if there's a table param in the URL
    if (tableParam) {
      // Don't update if the table ID is already set correctly
      if (tableParam === tableId) {
        console.log('Table ID already set correctly:', tableParam);
        return;
      }
      
      console.log('Setting table info from URL param:', tableParam);
      setIsLoading(true);
      
      const newTableInfo = {
        tableNumber: tableParam,
        tableId: tableParam,
        restaurantName: venueName || restaurantName || 'InSeat'
      };
      
      // Use the debounced function to prevent rapid updates
      debouncedSetTableInfo(newTableInfo);
    }
    // If no table in URL and no table in context, try to retrieve from localStorage
    else if (!tableNumber && !tableId) {
      const storedTable = localStorage.getItem('tableInfo');
      if (storedTable) {
        try {
          const parsedInfo = JSON.parse(storedTable);
          if (parsedInfo.tableId && parsedInfo.tableId !== tableId) {
            console.log('Using stored table info:', parsedInfo);
            setTableInfo(parsedInfo);
          }
        } catch (e) {
          console.error('Error parsing stored table info:', e);
          localStorage.removeItem('tableInfo');
        }
      }
    }
  // Include only dependencies that should trigger a re-evaluation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, tableName, tableId, debouncedSetTableInfo]);
  
  // Use props with fallbacks to context values
  const displayVenueName = venueName || restaurantName || 'InSeat';
  
  // Format table ID to show as Table + last 4 characters if it's long
  const formatTableName = (tableId: string) => {
    if (tableId && tableId.length > 8) {
      return tableId.slice(-4);
    }
    return tableId;
  };
  
  // Use provided tableName first, then fall back to context value
  const effectiveTableId = tableName || tableNumber || tableId || '';
  const displayTableNumber = effectiveTableId ? 
    `TABLE ${formatTableName(effectiveTableId)}` : 
    'NO TABLE';
  
  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      className
    )}>
      <div className="flex justify-between items-center px-4 py-3 bg-[#16141F] text-white border-b border-[#2D303E]">
        <div className="flex-1">
          <h1 className="text-sm font-medium truncate">{displayVenueName}</h1>
        </div>
        
        <div className="flex items-center justify-center bg-[#2D303E] rounded-md px-3 py-1">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-white animate-spin" />
          ) : (
            <span className="text-xs font-semibold tracking-wider text-white">{displayTableNumber}</span>
          )}
        </div>
        
        <div className="flex-1 flex justify-end items-center gap-3">
          {/* QR Scan button removed as per user request */}
          
          {/* Account button */}
          <Button
            variant="ghost"
            className="flex items-center text-white h-8 w-8 rounded-md hover:bg-[#3a3e52] flex items-center justify-center p-0"
            aria-label="Account"
            onClick={() => {
              console.log('User clicked account icon, authenticated:', isAuthenticated);
              
              // Simple direct check - if authenticated, go to account; otherwise go to login
              if (isAuthenticated) {
                navigate('/account');
              } else {
                    console.log('Not authenticated, redirecting to login');
                    navigate('/login', { state: { from: '/account' } });
              }
            }}
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

// Keep default export for backward compatibility
export default TableHeader;
