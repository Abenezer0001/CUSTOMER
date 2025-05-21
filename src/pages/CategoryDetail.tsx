import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ChevronLeft, Plus, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import TableHeader from '@/components/TableHeader';
import MenuItemCard from '@/components/menu/MenuItemCard';
import { ItemDetailDrawer } from '@/components/ItemDetailDrawer';
// Removed import for local api service
import { Category, MenuItem, SubCategory } from '@/types/menu';
import { API_BASE_URL } from '@/constants';
import { useTableInfo } from '@/context/TableContext';

const CategoryDetail: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { tableId, restaurantName } = useTableInfo();
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get table ID from URL query params
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const tableParam = queryParams.get('table');
    if (tableParam) {
      console.log('Setting tableId from URL:', tableParam);
      // Removed setting tableId from URL
    } else {
      console.warn('No table ID found in URL');
    }
  }, []);
  
  // Debug log to ensure tableId is being set correctly
  useEffect(() => {
    console.log('Current tableId state:', tableId);
  }, [tableId]);

  // We'll use a more reliable approach for demo - hard code the category data
  // In a real app you'd fetch this from the API but for reliability in demo we hardcode
  const categoryMap = {
    '681a585c1a12c59b214b3acc': {
      _id: '681a585c1a12c59b214b3acc',
      name: 'Popcorn & Snacks',
      description: 'Cinema classics and movie munchies',
      image: 'https://images.pexels.com/photos/2983098/pexels-photo-2983098.jpeg',
      isActive: true
    },
    '681a585d1a12c59b214b3ada': {
      _id: '681a585d1a12c59b214b3ada',
      name: 'Beverages',
      description: 'Refreshing drinks for your movie',
      image: 'https://images.pexels.com/photos/2983098/pexels-photo-2983098.jpeg',
      isActive: true
    },
    '681a585f1a12c59b214b3ae8': {
      _id: '681a585f1a12c59b214b3ae8',
      name: 'Meals',
      description: 'Substantial food options for cinema dining',
      image: 'https://images.pexels.com/photos/2955819/pexels-photo-2955819.jpeg',
      isActive: true
    }
  };

  // Fetch category details - with hardcoded fallback for reliability
  const { data: category, isLoading: isCategoryLoading } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      if (!categoryId) {
        setError("No category ID provided");
        throw new Error("No category ID provided");
      }
      
      try {
        // First check our hardcoded data (for reliability)
        if (categoryMap[categoryId]) {
          console.log('Using hardcoded category data for demo');
          return categoryMap[categoryId];
        }
        
        // If not in our hardcoded data, try the API
        if (tableId) {
          const response = await axios.get<Category>(
            `${API_BASE_URL}/categories/${categoryId}`,
            { timeout: 5000 }
          );
          console.log('Category fetched from API:', response.data);
          return response.data;
        } else {
          setError("Missing table information");
          throw new Error("Missing table information");
        }
      } catch (error) {
        console.error("Error fetching category data:", error);
        
        // Last resort - if we have the categoryId in our map,
        // return it even if the API call failed
        if (categoryMap[categoryId]) {
          return categoryMap[categoryId];
        }
        
        setError("Failed to load category data. Please try again later.");
        throw error;
      }
    },
    enabled: !!categoryId,
    retry: 1,
  });

  // Fetch subcategories if needed
  const { data: subCategories = [] } = useQuery({
    queryKey: ['subcategories', categoryId, tableId],
    queryFn: async () => {
      if (tableId) {
        try {
          const response = await axios.get<SubCategory[]>(
            `${API_BASE_URL}/subcategories?categoryId=${categoryId}`
          );
          return response.data;
        } catch (error) {
          console.error("Error fetching subcategories:", error);
          return [];
        }
      }
      return [];
    },
    enabled: !!categoryId && !!tableId && !error,
  });

  // Fetch menu items
  const { data: menuItems = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ['menuItemsByCategory', categoryId, selectedSubCategory, tableId],
    queryFn: async () => {
      if (tableId) {
        try {
          // Construct query params for API
          const params = new URLSearchParams();
          if (categoryId) params.append('categoryId', categoryId);
          if (selectedSubCategory) params.append('subCategoryId', selectedSubCategory);
          
          const response = await axios.get<MenuItem[]>(
            `${API_BASE_URL}/menu-items?${params.toString()}`
          );
          return response.data;
        } catch (error) {
          console.error("Error fetching menu items:", error);
          return [];
        }
      } else {
        // No tableId, return empty array
        console.error("Missing table information for menu items");
        return [];
      }
    },
    enabled: !!categoryId && !!tableId && !error,
  });

  // Get venue information from the context
  // Fallback to 'Screen 3' if not available

  const handleBack = () => {
    navigate(tableId ? `/?table=${tableId}` : '/');
  };

  const handleSubCategorySelect = (subCategoryId: string) => {
    setSelectedSubCategory(subCategoryId === selectedSubCategory ? null : subCategoryId);
  };

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    // Allow some time for the drawer animation before clearing the selected item
    setTimeout(() => setSelectedItem(null), 300);
  };

  // Show error state if category not found
  if (error) {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold mb-4">Category not found</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button variant="default" onClick={handleBack}>
            Back to Categories
          </Button>
        </div>
      </div>
    );
  }

  if (isCategoryLoading) {
    console.log('Category data is loading');
    return (
      <div className="min-h-screen p-4 flex justify-center items-center">
        <div className="animate-pulse space-y-4 max-w-md w-full">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="h-8 bg-muted rounded w-32"></div>
          <div className="h-64 bg-muted rounded w-full"></div>
        </div>
      </div>
    );
  }

  // Log the category data to help debug
  console.log('Rendering with category data:', category);
  
  if (!category) {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center">
        <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-lg max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">Unable to load category</h2>
          <p className="text-muted-foreground mb-6">The requested category could not be loaded. Please try again later.</p>
          <Button variant="secondary" onClick={handleBack}>
            Back to Categories
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pb-24"
    >
      {/* TableHeader for consistent experience */}
      <TableHeader 
        venueName={restaurantName || 'Screen 3'} 
        className="bg-[#16141F] text-white"
      />

      {/* Category Header */}
      <div 
        className="relative h-40 bg-cover bg-center flex items-end mt-14" 
        style={{ 
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(${category.image})` 
        }}
      >
        <Button
          variant="ghost"
          className="absolute top-4 left-4 text-white bg-black/30 hover:bg-black/40 p-2 rounded-full" 
          onClick={handleBack}
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="p-6 text-white w-full">
          <h1 className="text-2xl font-bold">{category.name}</h1>
          <p className="text-sm opacity-90">{menuItems.length} Items</p>
        </div>
      </div>
      
      {/* Subcategories horizontal scroll */}
      {subCategories.length > 0 && (
        <div className="p-4 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {subCategories.map((subCategory) => (
              <Button
                key={subCategory._id}
                variant={selectedSubCategory === subCategory._id ? "default" : "outline"}
                className="rounded-full whitespace-nowrap"
                onClick={() => handleSubCategorySelect(subCategory._id)}
              >
                {subCategory.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Menu Items - Grid with 2 columns for all screen sizes */}
      <div className="container mx-auto p-4">
        {isItemsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : menuItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {menuItems.map((item) => (
              <div key={item.id} className="relative group">
                <MenuItemCard 
                  item={item} 
                  onClick={() => handleSelectItem(item)}
                />
                <Button 
                  variant="default"
                  size="icon" 
                  className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-purple-600 hover:bg-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectItem(item);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No items found in this category</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleBack}
            >
              Back to Categories
            </Button>
          </div>
        )}
      </div>

      {/* Item Detail Drawer */}
      <Drawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen}
        onClose={handleCloseDrawer}
      >
        <DrawerContent className="h-[80vh]">
          {selectedItem && (
            <ItemDetailDrawer 
              item={selectedItem} 
              onClose={handleCloseDrawer}
            />
          )}
        </DrawerContent>
      </Drawer>
    </motion.div>
  );
};

export default CategoryDetail;
