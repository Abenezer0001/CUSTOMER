
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MenuItemComponent } from '@/components/MenuItemComponent';
import { api } from '@/services/api';

interface Category {
  id: string;
  name: string;
  image: string;
  subCategories: string[];
}

const CategoryDetail: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Get categories data
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-data'],
    queryFn: async () => {
      const response = await fetch('/src/data/categories-data.json');
      return response.json();
    }
  });
  
  // Get menu items
  const { data: menuItems, isLoading: menuItemsLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: api.getMenuItems,
  });
  
  const category: Category | undefined = categoriesData?.find(
    (cat: Category) => cat.id === categoryId
  );
  
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  
  useEffect(() => {
    if (!menuItems || !category) return;
    
    let filtered = menuItems.filter((item: any) => item.category === categoryId);
    
    // Filter by subcategory if needed
    if (activeSubCategory !== 'all') {
      // This is simplified - you would need a proper mapping between 
      // subcategories and menu items in your actual implementation
      filtered = filtered.filter((item: any) => 
        item.tags?.includes(activeSubCategory.toLowerCase())
      );
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) =>
        item.name.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query)
      );
    }
    
    setFilteredItems(filtered);
  }, [menuItems, categoryId, activeSubCategory, searchQuery, category]);
  
  if (menuItemsLoading || !category) {
    return (
      <div className="pt-16 px-4 animate-pulse">
        <div className="h-6 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-12 w-full bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-8 w-full bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-gray-300 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="pt-16 pb-24">
      {/* Header */}
      <div className="relative h-48">
        <motion.img 
          src={category.image} 
          alt={category.name}
          className="w-full h-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80"></div>
        
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-black/30 text-white hover:bg-black/50 rounded-full"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        {/* Category title */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white">{category.name}</h1>
          <p className="text-white/80 text-sm">
            {category.subCategories.length} subcategories
          </p>
        </div>
      </div>
      
      {/* Search bar */}
      <div className="px-4 py-4 sticky top-0 bg-background/80 backdrop-blur-lg z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-none"
          />
        </div>
      </div>
      
      {/* Subcategories */}
      <div className="px-4">
        <div className="overflow-x-auto flex gap-2 pb-4 no-scrollbar">
          <Button
            variant={activeSubCategory === 'all' ? 'default' : 'outline'}
            className="flex-shrink-0"
            onClick={() => setActiveSubCategory('all')}
          >
            All
          </Button>
          
          {category.subCategories.map((subCategory) => (
            <Button
              key={subCategory}
              variant={activeSubCategory === subCategory ? 'default' : 'outline'}
              className="flex-shrink-0 whitespace-nowrap"
              onClick={() => setActiveSubCategory(subCategory)}
            >
              {subCategory}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Menu items */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubCategory}
          className="px-4 grid grid-cols-2 gap-3 mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <MenuItemComponent key={item.id} item={item} />
            ))
          ) : (
            <div className="col-span-2 py-12 text-center">
              <p className="text-muted-foreground">No items found.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CategoryDetail;
