import React, { useState } from 'react';
import { MenuGrid } from '@/components/menu/MenuGrid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TabsList, TabsTrigger, Tabs } from '@/components/ui/tabs';
import { Search, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ItemDetailDrawer } from '@/components/ItemDetailDrawer';
import { MenuItem } from '@/types/menu';
import { MenuItemCardSkeleton } from '@/components/menu/MenuItemCardSkeleton';
import { useTableInfo } from '@/context/TableContext';

// Default categories if API fails
const defaultCategories = [
  { id: 'all', name: 'All' },
  { id: 'food', name: 'Food' },
  { id: 'drinks', name: 'Drinks' },
  { id: 'desserts', name: 'Desserts' },
  { id: 'promotions', name: 'Promotions' },
];

const Menu: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tableId, restaurantId } = useTableInfo();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Get categories from API
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
    placeholderData: defaultCategories
  });

  // Extract search query from URL if present
  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryParam = searchParams.get('search');
    if (queryParam) {
      setSearchQuery(queryParam);
    }
  }, [location.search]);

  // Handlers for item details drawer
  const handleOpenDrawer = (item: MenuItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  // Reset to top when changing category
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCategory]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 animate-fade-in">
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-3xl font-medium mb-4">Our Menu</h1>
        <p className="text-muted-foreground">Discover our exquisite selection of dishes</p>
        
        {/* Group Ordering Button - redirects to cart */}
        <div className="mt-6">
          <Button
            onClick={() => {
              console.log('Group Order button clicked - redirecting to cart', { tableId, restaurantId });
              navigate('/cart');
            }}
            variant="outline"
            className="rounded-full px-6 py-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors"
            disabled={!tableId}
          >
            <Users className="h-4 w-4 mr-2" />
            Group Order
          </Button>
          {!tableId && (
            <p className="text-xs text-red-500 mt-1">
              Missing table info (tableId: {tableId || 'missing'})
            </p>
          )}
        </div>
        
        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
            Debug: tableId={tableId}, restaurantId={restaurantId}
          </div>
        )}
      </div>
      
      {/* Search and Categories */}
      <div className="space-y-6 mb-8">
        {/* Search Bar */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search menu..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Tabs */}
        <Tabs 
          value={activeCategory} 
          onValueChange={setActiveCategory}
          className="w-full"
        >
          <TabsList className="flex flex-wrap justify-center gap-2 bg-transparent">
            {categoriesLoading ? (
              // Loading skeleton for categories
              <>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-9 w-24 bg-muted animate-pulse rounded-md" />
                ))}
              </>
            ) : (
              categories?.map((category) => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="data-[state=active]:bg-marian-blue data-[state=active]:text-white"
                >
                  {category.name}
                </TabsTrigger>
              ))
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Menu Grid */}
      <MenuGrid 
        category={activeCategory} 
        searchQuery={searchQuery}
        onItemClick={handleOpenDrawer}
      />

      {/* Item Detail Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          {selectedItem && (
            <ItemDetailDrawer 
              item={selectedItem} 
              onClose={handleCloseDrawer}
            />
          )}
        </DrawerContent>
      </Drawer>

    </div>
  );
};

export default Menu;
