import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { TableHeader } from '@/components/TableHeader';
import { BottomNav } from '@/components/BottomNav';
import { useTableInfo } from '@/context/TableContext';
import { useTheme } from 'next-themes';
import { ScanLine, ShoppingCart, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import CartDrawer from '@/components/CartDrawer';
import AIChatDrawer from '@/components/AIChatDrawer';
import { ItemDetailDrawer } from '@/components/ItemDetailDrawer';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { MenuItem } from '@/types';

const Layout: React.FC = () => {
  const { tableNumber, setTableInfo } = useTableInfo();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { cartItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isItemDetailOpen, setIsItemDetailOpen] = useState(false);
  
  useEffect(() => {
    // Extract table number from URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const tableParam = queryParams.get('table');
    
    if (tableParam && tableParam !== tableNumber) {
      // If table parameter exists in URL and is different from current, use it
      setTableInfo(prev => ({
        ...prev,
        tableNumber: tableParam
      }));
    } else if (!tableNumber) {
      // Check if we need to generate a random table number
      const storedTable = localStorage.getItem('tableInfo');
      if (!storedTable || !JSON.parse(storedTable).tableNumber) {
        const randomTable = generateRandomTableNumber();
        setTableInfo(prev => ({
          ...prev,
          tableNumber: randomTable
        }));
      }
    }
  }, [location.search, tableNumber]);
  
  // Generate a random alphanumeric table number of length 4
  const generateRandomTableNumber = (): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  
  // Handle add to cart from AI Chat - opens ItemDetailDrawer
  const handleAIAddToCart = (item: MenuItem) => {
    setSelectedItem(item);
    setIsItemDetailOpen(true);
  };
  
  // Don't show header on scan page
  const isScanPage = location.pathname === '/scan';
  
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#16141F', color: 'white' }}>
      <div className="relative">
        {!isScanPage && <TableHeader />}
        
        {/* Scan button removed as per user request */}
      </div>
      
      {/* Floating cart icon */}
      {cartItems && cartItems.length > 0 && (
        <div className="fixed bottom-20 right-4 z-50">
          <Button 
            size="icon" 
            className="h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart className="h-6 w-6 text-white" />
            {cartItems.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {cartItems.length}
              </span>
            )}
          </Button>
        </div>
      )}
      
      {/* Floating AI Chat button */}
      <div className="fixed bottom-20 left-4 z-50">
        <AIChatDrawer onAddToCart={handleAIAddToCart} />
      </div>
      
      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      
      {/* Item Detail Drawer for AI selections */}
      <Drawer open={isItemDetailOpen} onOpenChange={setIsItemDetailOpen}>
        <DrawerContent>
          {selectedItem && (
            <ItemDetailDrawer 
              item={selectedItem} 
              onClose={() => setIsItemDetailOpen(false)} 
            />
          )}
        </DrawerContent>
      </Drawer>
      
      {/* Set main content background to dark color and ensure proper text color */}
      <main className="flex-grow pb-20" style={{ backgroundColor: '#16141F' }}> 
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
