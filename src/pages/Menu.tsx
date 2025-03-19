
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Category, MenuItem } from '@/types';
import { MenuItemCard } from '@/components/MenuItemCard';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter } from 'lucide-react';

const Menu: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);

  // Get categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  // Get menu items
  const { data: menuItems, isLoading: menuItemsLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: api.getMenuItems,
  });

  // Filter items based on category and search query
  useEffect(() => {
    if (!menuItems) return;

    let filtered = [...menuItems];

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(item => item.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredItems(filtered);
  }, [menuItems, activeCategory, searchQuery]);

  // Reset to top when changing category
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCategory]);

  if (menuItemsLoading || categoriesLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 animate-fade-in">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-medium mb-4">Our Menu</h1>
          <p className="text-muted-foreground">Discover our exquisite selection of dishes</p>
        </div>
        
        <div className="animate-pulse h-12 bg-secondary rounded-full w-full max-w-md mx-auto mb-8"></div>
        
        <div className="animate-pulse h-10 bg-secondary rounded-full max-w-3xl mx-auto mb-16"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-[400px] bg-secondary animate-pulse rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 animate-fade-in">
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-4xl font-medium mb-4">Our Menu</h1>
        <p className="text-muted-foreground">Discover our exquisite selection of dishes</p>
      </div>
      
      {/* Search Bar */}
      <div className="relative max-w-md mx-auto mb-8">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <Input
          type="text"
          placeholder="Search dishes, ingredients..."
          className="pl-10 py-6 rounded-full bg-secondary/70 border-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {/* Category Tabs */}
      <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
        <TabsList className="flex justify-start mb-4 overflow-x-auto p-1 custom-scrollbar gap-2 w-full bg-transparent">
          <TabsTrigger 
            value="all" 
            className="menu-category"
          >
            All
          </TabsTrigger>
          
          {categories?.map((category: Category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="menu-category"
            >
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {/* Items Grid - Same content for all tabs, filtering handled by state */}
        <div className="mt-8">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-2">No items found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item: MenuItem) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default Menu;
