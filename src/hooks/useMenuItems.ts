import { useState, useEffect } from 'react';
import { MenuItem } from '@/types/menu';
import { api } from '@/services/api';

export const useMenuItems = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      try {
        setIsLoading(true);
        const menuItems = await api.getMenuItems();
        setItems(menuItems);
      } catch (err) {
        console.error('Error loading menu items:', err);
        setError(err instanceof Error ? err : new Error('Failed to load menu items'));
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, []);

  return { items, isLoading, error };
};

