
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Bell, ClipboardList, Receipt } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Dock, DockItem, DockIcon, DockLabel } from '@/components/ui/dock';

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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[url('/lovable-uploads/357c4052-21e4-4c8d-ba4a-c9962646d47a.png')] bg-cover bg-center">
      <Dock className="bg-black/40 backdrop-blur-sm text-white">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <DockItem 
              className="aspect-square rounded-full bg-black/20 backdrop-blur-md border border-white/10 hover:bg-emerald-900/30"
              isActive={location.pathname === item.path}
            >
              <DockLabel>{item.label}</DockLabel>
              <DockIcon>
                {item.icon}
                {item.path === '/my-orders' && totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </DockIcon>
            </DockItem>
          </Link>
        ))}
      </Dock>
    </div>
  );
};

export default BottomNav;
