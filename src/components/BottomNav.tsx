import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Bell, ClipboardList, Receipt } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { items } = useCart();
  
  const navItems = [
    { path: '/', icon: <Menu size={20} />, label: 'Menu' },
    { path: '/call-waiter', icon: <Bell size={20} />, label: 'Call Waiter' },
    { path: '/my-orders', icon: <ClipboardList size={20} />, label: 'My Orders' },
    { path: '/bill', icon: <Receipt size={20} />, label: 'Get Bill' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#16141F] border-t border-[#2D303E] py-2">
      <div className="flex items-center justify-around w-full">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className="flex flex-col items-center relative"
            >
              {isActive && (
                <div className="p-1.5 transition-all duration-200 scale-105">
                  <div className="text-[#7B61FF]">{item.icon}</div>
                </div>
              )}

              {!isActive && (
                <div className="p-1.5 transition-all duration-200">
                  <div className="text-gray-400">{item.icon}</div>
                </div>
              )}

              <span 
                className={`text-xs mt-0.5 ${isActive ? 'text-[#7B61FF]' : 'text-gray-400'}`}
              >
                {item.label}
              </span>

              {item.path === '/my-orders' && Array.isArray(items) && items.length > 0 && (
                <span className="absolute -top-1 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                  {items.length}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
