
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
    <div className="fixed bottom-0 left-0 right-0 z-50"> {/* Removed pb-4 */}
      {/* Make dock full width, apply raisin-black bg, adjust padding/justification */}
      <Dock className="bg-raisin-black px-4 py-3 flex items-center justify-around w-full"> 
        {navItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <DockItem 
              className="p-0 flex flex-col items-center" // Ensure vertical layout if needed
              isActive={location.pathname === item.path}
            >
              {/* Update active/inactive colors */}
              <DockIcon className={`transition-all duration-200 ${location.pathname === item.path ? 'text-marian-blue scale-110' : 'text-muted-foreground'}`}> 
                {React.cloneElement(item.icon, { size: 24 })} {/* Slightly larger icon */}
                {item.path === '/my-orders' && totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </DockIcon>
               {/* Ensure label is visible and styled */}
              <DockLabel className={`text-xs mt-1 ${location.pathname === item.path ? 'text-marian-blue' : 'text-muted-foreground'}`}>{item.label}</DockLabel>
            </DockItem>
          </Link>
        ))}
      </Dock>
    </div>
  );
};

export default BottomNav;
