
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Bell, ClipboardList, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { totalItems } = useCart();
  
  const navItems = [
    { path: '/', icon: <Menu size={24} />, label: 'Menu' },
    { path: '/call-waiter', icon: <Bell size={24} />, label: 'Call Waiter' },
    { path: '/my-orders', icon: <ClipboardList size={24} />, label: 'My Orders' },
    { path: '/bill', icon: <Receipt size={24} />, label: 'Get Bill' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[url('/lovable-uploads/357c4052-21e4-4c8d-ba4a-c9962646d47a.png')] bg-cover bg-center">
      <div className="grid grid-cols-4 bg-black/40 backdrop-blur-sm text-white">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center py-2 relative",
              location.pathname === item.path ? "text-white" : "text-white/70"
            )}
          >
            {item.path === '/my-orders' && totalItems > 0 && (
              <span className="absolute top-0 right-6 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
