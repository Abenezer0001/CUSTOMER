import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MenuItemComponent } from '@/components/MenuItemComponent';
import { api } from '@/services/api';
import { MenuItem, Category } from '@/types';

// Local interface for the category with subCategories
interface CategoryWithSubcategories extends Category {
  subCategories: string[];
}

const CategoryDetail: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Get categories data
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });
  
  // Get menu items
  const { data: menuItems, isLoading: menuItemsLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: api.getMenuItems,
  });
  
  // Find the current category and cast to the local interface with required subCategories
  const category = categoriesData?.find(
    (cat) => cat.id === categoryId
  ) as CategoryWithSubcategories | undefined;
  
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [menuItemsBySubCategory, setMenuItemsBySubCategory] = useState<Record<string, MenuItem[]>>({});
  
  // Create a mapping of menu items by subcategory
  useEffect(() => {
    if (!menuItems || !category || !category.subCategories) return;
    
    // Filter items for this category
    const categoryItems = menuItems.filter((item: MenuItem) => 
      item.categoryId === categoryId || item.category === categoryId
    );
    
    // Create a mapping for each subcategory
    const mapping: Record<string, MenuItem[]> = {};
    
    // Add a menu item for each subcategory 
    category.subCategories.forEach((subCat) => {
      // For each subcategory, assign a subset of menu items with images
      const subCategoryItems = categoryItems.slice(0, 4).map((item, index) => ({
        ...item,
        id: `${item.id}-${subCat}-${index}`,
        name: `${subCat} ${item.name}`,
        image: `https://foodish-api.herokuapp.com/images/burger/burger${Math.floor(Math.random() * 30) + 1}.jpg`
      }));
      
      mapping[subCat] = subCategoryItems;
    });
    
    setMenuItemsBySubCategory(mapping);
    
    // Set initial filtered items
    if (activeSubCategory === 'all') {
      // Flatten all subcategory arrays into one
      const allItems = Object.values(mapping).flat();
      setFilteredItems(allItems);
    } else {
      setFilteredItems(mapping[activeSubCategory] || []);
    }
  }, [menuItems, categoryId, category]);
  
  // Filter items based on subcategory and search
  useEffect(() => {
    if (!category) return;
    
    let items: MenuItem[] = [];
    
    if (activeSubCategory === 'all') {
      // Get all items from all subcategories
      items = Object.values(menuItemsBySubCategory).flat();
    } else {
      // Get items only from the selected subcategory
      items = menuItemsBySubCategory[activeSubCategory] || [];
    }
    
    // Apply search filter if needed
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    setFilteredItems(items);
  }, [activeSubCategory, searchQuery, menuItemsBySubCategory, category]);
  
  // Reset to top when changing category
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSubCategory]);
  
  if (menuItemsLoading || categoriesLoading || !category) {
    return (
      <div className="pt-16 px-4 animate-pulse">
        <div className="h-6 w-24 bg-secondary rounded mb-4"></div>
        <div className="h-12 w-full bg-secondary rounded mb-4"></div>
        <div className="h-8 w-full bg-secondary rounded mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-secondary rounded"></div>
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
        <div className="absolute bottom-2 left-4 right-4">
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
            className="flex-shrink-0 bg-marian-blue hover:bg-marian-blue/90"
            onClick={() => setActiveSubCategory('all')}
          >
            All
          </Button>
          
          {category.subCategories.map((subCategory) => (
            <Button
              key={subCategory}
              variant={activeSubCategory === subCategory ? 'default' : 'outline'}
              className={`flex-shrink-0 whitespace-nowrap ${
                activeSubCategory === subCategory 
                  ? 'bg-marian-blue hover:bg-marian-blue/90' 
                  : 'hover:bg-marian-blue/10 hover:text-marian-blue border-marian-blue/30'
              }`}
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
          key={activeSubCategory + searchQuery}
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
