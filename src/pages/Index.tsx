
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Category, MenuItem } from '@/types';
import { MenuItemComponent } from '@/components/MenuItemComponent';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';

const Index: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  // Get categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  // Get menu items
  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: api.getMenuItems,
  });

  // Filter items based on category
  useEffect(() => {
    if (!menuItems) return;

    let filtered = [...menuItems];

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(item => item.category === activeCategory);
    }

    setFilteredItems(filtered);
  }, [menuItems, activeCategory]);

  if (isLoading) {
    return (
      <div className="px-4 py-4 mt-16">
        <div className="flex overflow-x-auto gap-2 py-3 mb-4">
          {[1, 2, 3, 4].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="h-[120px] bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mt-16">
      <div className="flex overflow-x-auto gap-2 py-3 mb-4 no-scrollbar">
        <Button
          onClick={() => setActiveCategory('all')}
          variant={activeCategory === 'all' ? "default" : "outline"}
          className="rounded-full flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          All
        </Button>
        
        {categories?.map((category: Category) => (
          <Button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            variant={activeCategory === category.id ? "default" : "outline"}
            className={`rounded-full flex-shrink-0 ${
              activeCategory === category.id 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                : "text-gray-700"
            }`}
          >
            {category.name}
          </Button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-24">
        {filteredItems.map((item: MenuItem) => (
          <MenuItemComponent key={item.id} item={item} />
        ))}
      </div>
      
      {/* Cart Sheet */}
      {items.length > 0 && (
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              className="fixed bottom-24 right-4 h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg"
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                {items.reduce((total, item) => total + item.quantity, 0)}
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <div className="h-full flex flex-col">
              <h2 className="text-xl font-semibold mb-4">Your Cart</h2>
              
              <div className="flex-1 overflow-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between py-4 border-b">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-sm text-gray-500 mt-1">
                          {item.modifiers.map(mod => (
                            <div key={mod.id}>+{mod.name} (${mod.price.toFixed(2)})</div>
                          ))}
                        </div>
                      )}
                      {item.cookingPreference && (
                        <div className="text-sm text-gray-500 mt-1">
                          {item.cookingPreference}
                        </div>
                      )}
                      <div className="text-sm font-medium mt-1">
                        ${item.price.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="w-6 text-center">{item.quantity}</span>
                      
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-auto pt-4 border-t">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-gray-600">Tax (10%)</span>
                  <span>${(subtotal * 0.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold mb-4">
                  <span>Total</span>
                  <span>${(subtotal + subtotal * 0.1).toFixed(2)}</span>
                </div>
                
                <Button 
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => window.location.href = '/checkout'}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default Index;
