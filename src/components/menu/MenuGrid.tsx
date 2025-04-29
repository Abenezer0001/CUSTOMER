import React from 'react';
import { useMenuItems } from '@/hooks/useMenuItems';
import { MenuItemCard } from './MenuItemCard';
import { MenuItemCardSkeleton } from './MenuItemCardSkeleton';
import { MenuItem } from '@/types/menu';

interface MenuGridProps {
  category?: string;
  searchQuery?: string;
  onItemClick?: (item: MenuItem) => void;
}

export const MenuGrid: React.FC<MenuGridProps> = ({ category, searchQuery, onItemClick }) => {
  const { items, isLoading, error } = useMenuItems();

  // Filter items based on category and search query
  const filteredItems = React.useMemo(() => {
    if (!items) return [];
    
    let filtered = [...items];
    
    // Filter by category
    if (category && category !== 'all') {
      filtered = filtered.filter(item => 
        item.category.toLowerCase() === category.toLowerCase() ||
        item.categoryId.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [items, category, searchQuery]);

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load menu items. Please try again later.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {isLoading ? (
        <>
          {[...Array(8)].map((_, i) => (
            <MenuItemCardSkeleton key={i} />
          ))}
        </>
      ) : (
        filteredItems.map((item) => (
          <MenuItemCard 
            key={item.id} 
            item={item} 
            onClick={() => onItemClick?.(item)}
          />
        ))
      )}
      
      {!isLoading && filteredItems.length === 0 && (
        <div className="col-span-full text-center py-12">
          <h3 className="text-xl font-medium mb-2">No items found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default MenuGrid;

