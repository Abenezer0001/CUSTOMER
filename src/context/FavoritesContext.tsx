import React, { createContext, useContext, useState, useEffect } from 'react';
import { FavoritesContextType } from '@/types';
import { toast } from 'sonner';

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>(() => {
    const savedFavorites = localStorage.getItem('favorites');
    return savedFavorites ? JSON.parse(savedFavorites) : [];
  });

  // Listen for favorites clear events from logout
  useEffect(() => {
    const handleFavoritesClear = () => {
      console.log('Favorites cleared due to logout');
      localStorage.removeItem('favorites');
      setFavorites([]);
    };
    
    window.addEventListener('favorites-cleared', handleFavoritesClear);
    
    return () => {
      window.removeEventListener('favorites-cleared', handleFavoritesClear);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (itemId: string) => {
    setFavorites(prev => {
      if (!prev.includes(itemId)) {
        toast.success('Added to favorites');
        return [...prev, itemId];
      }
      return prev;
    });
  };

  const removeFavorite = (itemId: string) => {
    setFavorites(prev => {
      if (prev.includes(itemId)) {
        toast.info('Removed from favorites');
        return prev.filter(id => id !== itemId);
      }
      return prev;
    });
  };

  const isFavorite = (itemId: string): boolean => {
    return favorites.includes(itemId);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
