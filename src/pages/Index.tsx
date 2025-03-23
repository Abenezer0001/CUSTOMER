
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Category, MenuItem } from '@/types';
import { MenuItemComponent } from '@/components/MenuItemComponent';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
import { Search, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const Index: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  
  // Initialize embla carousel with autoplay
  const [emblaRef] = useEmblaCarousel({ 
    loop: true,
    align: 'start',
    dragFree: true
  }, [
    Autoplay({ delay: 3000, stopOnInteraction: false })
  ]);

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

  // Filter items based on category and search
  useEffect(() => {
    if (!menuItems) return;

    let filtered = [...menuItems];

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(item => item.category === activeCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  }, [menuItems, activeCategory, searchQuery]);

  // Add more dummy categories
  const allCategories = [
    { id: 'starters', name: 'Starters' },
    { id: 'mains', name: 'Main Courses' },
    { id: 'desserts', name: 'Desserts' },
    { id: 'drinks', name: 'Drinks' },
    { id: 'sides', name: 'Sides' },
    { id: 'breakfast', name: 'Breakfast' },
    { id: 'lunch', name: 'Lunch' },
    { id: 'dinner', name: 'Dinner' }
  ];

  // Promotional offers data
  const promos = [
    {
      id: 1,
      title: "20% Promo Cashback",
      description: "On your first order",
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38"
    },
    {
      id: 2,
      title: "Free Delivery",
      description: "On orders over $30",
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38"
    },
    {
      id: 3,
      title: "Loyalty Rewards",
      description: "Get 10% off every 5th order",
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38"
    }
  ];

  // Category icons
  const getCategoryIcon = (category: string) => {
    switch(category.toLowerCase()) {
      case 'food':
      case 'mains':
        return '🍔';
      case 'breakfast':
        return '🍳';
      case 'lunch':
        return '🥪';
      case 'dinner':
        return '🍽️';
      case 'beverages':
      case 'drinks':
        return '🥤';
      case 'desserts':
        return '🍰';
      case 'appetizers':
      case 'starters':
        return '🍟';
      case 'offers':
        return '🏷️';
      case 'sides':
        return '🥗';
      case 'others':
        return '📦';
      default:
        return '🍽️';
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-4 mt-14">
        <div className="h-40 bg-gray-200 rounded-xl animate-pulse mb-8"></div>
        <div className="flex overflow-x-auto gap-2 py-3 mb-4">
          {[1, 2, 3, 4].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((_, i) => (
            <div key={i} className="h-[180px] bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mt-14">
      {/* Promotional Banner Carousel */}
      <div className="mb-8 mt-2 relative">
        <div className="overflow-hidden rounded-xl" ref={emblaRef}>
          <div className="flex">
            {promos.map((promo) => (
              <div key={promo.id} className="flex-[0_0_100%] min-w-0 relative">
                <div className="relative overflow-hidden h-36 mx-1">
                  <img 
                    src={promo.image} 
                    alt={promo.title} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center p-6 text-white">
                    <h3 className="text-lg font-bold">{promo.title}</h3>
                    <p className="text-sm">{promo.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search Bar overlapping slider */}
        <div className="absolute -bottom-4 left-0 right-0 z-10 px-4">
          <div className="mx-auto max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input 
                type="text" 
                placeholder="Find your favorite food..." 
                className="pl-9 py-2 pr-4 rounded-full shadow-lg border-none text-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Selector - horizontal scrolling */}
      <div className="mt-8 mb-6">
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
          <Button
            onClick={() => setActiveCategory('all')}
            variant={activeCategory === 'all' ? "default" : "outline"}
            className={`flex flex-col items-center p-2 h-16 w-16 rounded-xl flex-shrink-0 ${
              activeCategory === 'all' 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                : "bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100"
            }`}
          >
            <span className="text-xl mb-1">🍽️</span>
            <span className="text-[10px]">All</span>
          </Button>
          
          {allCategories.map((category) => (
            <Button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              variant={activeCategory === category.id ? "default" : "outline"}
              className={`flex flex-col items-center p-2 h-16 w-16 rounded-xl flex-shrink-0 ${
                activeCategory === category.id 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                  : "bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100"
              }`}
            >
              <span className="text-xl mb-1">{getCategoryIcon(category.name)}</span>
              <span className="text-[10px]">{category.name}</span>
            </Button>
          ))}
        </div>
      </div>
      
      {/* Popular section header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-bold text-emerald-800">Premium Food</h2>
        <Button variant="link" className="p-0 h-auto text-emerald-600 text-xs">
          See all
        </Button>
      </div>
      
      {/* Menu Items Grid - 2 columns */}
      <div className="grid grid-cols-2 gap-3 mb-24">
        {filteredItems.map((item: MenuItem) => (
          <MenuItemComponent key={item.id} item={item} />
        ))}
      </div>
      
      {/* Cart Sheet */}
      {items.length > 0 && (
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              className="fixed bottom-24 right-4 h-12 w-12 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {items.reduce((total, item) => total + item.quantity, 0)}
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <div className="h-full flex flex-col">
              <h2 className="text-lg font-semibold mb-4">Your Cart</h2>
              
              <div className="flex-1 overflow-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between py-3 border-b">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium">{item.name}</h3>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.modifiers.map(mod => (
                            <div key={mod.id}>+{mod.name} (${mod.price.toFixed(2)})</div>
                          ))}
                        </div>
                      )}
                      {item.cookingPreference && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.cookingPreference}
                        </div>
                      )}
                      <div className="text-xs font-medium mt-1">
                        ${item.price.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 rounded-full"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="w-5 text-center text-xs">{item.quantity}</span>
                      
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 rounded-full"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-auto pt-4 border-t">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 text-sm">Subtotal</span>
                  <span className="text-sm">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-gray-600 text-sm">Tax (10%)</span>
                  <span className="text-sm">${(subtotal * 0.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold mb-4">
                  <span>Total</span>
                  <span>${(subtotal + subtotal * 0.1).toFixed(2)}</span>
                </div>
                
                <Button 
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
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
