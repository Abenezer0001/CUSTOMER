import { useState, useEffect } from 'react';
import { MenuItem } from '@/types/menu';

export const useMenuItems = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await fetch('/src/data/menu-items.json');
        const data = await response.json();
        
        // Ensure all items have the required fields
        const processedItems = data.items.map((item: any) => ({
          ...item,
          imageSearchTerm: item.imageSearchTerm || item.name.toLowerCase(),
          tags: item.tags || [],
          featured: item.featured || false,
          popular: item.popular || false,
        }));
        
        setItems(processedItems);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load menu items'));
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, []);

  return { items, isLoading, error };
};

