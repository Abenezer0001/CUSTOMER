import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Wallet, Bell, ClipboardList, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useTableInfo } from '@/context/TableContext';

interface BottomNavProps {
  onCartOpen?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onCartOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const { tableId, restaurantId } = useTableInfo();
  
  // Special case for menu button to ensure we always pass the table ID
  const handleMenuClick = () => {
    // Check all possible sources of table ID
    const storedTableId = localStorage.getItem('currentTableId') || 
                         localStorage.getItem('table_id') || 
                         localStorage.getItem('tableId');
    const effectiveTableId = tableId || storedTableId || '';
    
    console.log('Navigating to menu with table ID:', effectiveTableId);
    
    if (effectiveTableId) {
      navigate(`/?table=${effectiveTableId}`);
    } else {
      navigate('/');
    }
  };
  
  // Helper function to get path with table ID if available
  const getPathWithTableId = (path: string): string => {
    if (tableId) {
      const separator = path.includes('?') ? '&' : '?';
      return `${path}${separator}table=${tableId}`;
    }
    return path;
  };
  
  const navItems = [
    {
      path: '/',
      icon: <Menu className="h-6 w-6" />,
      label: 'Menu',
      onClick: handleMenuClick // Special handler for menu
    },
    {
      path: '/my-orders',
      icon: <ClipboardList className="h-6 w-6" />,
      label: 'My Orders',
      onClick: () => navigate(getPathWithTableId('/my-orders'))
    },
    {
      path: '/bill',
      icon: <Wallet className="h-6 w-6" />,
      label: 'Bill',
      onClick: () => navigate(getPathWithTableId('/bill'))
    },
    {
      path: '/call-waiter',
      icon: <Bell className="h-6 w-6" />,
      label: 'Call Waiter',
      onClick: () => navigate(getPathWithTableId('/call-waiter'))
    },
    {
      path: '/cart',
      icon: <ShoppingCart className="h-6 w-6" />,
      label: 'Cart',
      onClick: () => {
        console.log('BottomNav Cart clicked', { tableId, restaurantId });
        if (onCartOpen) {
          onCartOpen();
        }
      }
    },
  ];
  
  const currentPath = location.pathname === '/' || location.pathname === '/menu' ? '/' : location.pathname;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1F1D2B] border-t border-[#2D303E] py-2">
      <div className="flex items-center justify-around w-full">
        {navItems.map((item) => {
          // Check if path is active without considering query parameters
          const basePath = item.path.split('?')[0];
          const currentPath = location.pathname;
          const isActive = currentPath === basePath;
          
          return (
            <div
              key={item.path} 
              className="flex flex-col items-center relative"
              onClick={item.onClick || (() => navigate(item.path))}
              style={{ cursor: 'pointer' }}
            >
              <div 
                className={`p-1.5 transition-all duration-200 ${
                  isActive ? 'bg-[#252836] rounded-lg' : ''
                }`}
              >
                <div className={isActive ? 'text-[#6C5ECF]' : 'text-gray-400'}>
                  {item.icon}
                </div>
              </div>

              <span 
                className={`text-xs mt-0.5 ${isActive ? 'text-[#6C5ECF] font-medium' : 'text-gray-400'}`}
              >
                {item.label}
              </span>

              {basePath === '/my-orders' && Array.isArray(cartItems) && cartItems.length > 0 && (
                <span className="absolute -top-1 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                  {cartItems.length}
                </span>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default BottomNav;
