
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFavorites } from '@/context/FavoritesContext';
import { api } from '@/services/api';
import { MenuItem } from '@/types';
import { MenuItemCard } from '@/components/MenuItemCard';
import { Button } from '@/components/ui/button';
import { HeartOff } from 'lucide-react';

const Favorites: React.FC = () => {
  const { favorites } = useFavorites();
  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: api.getMenuItems,
  });

  const favoriteItems = menuItems?.filter((item: MenuItem) => 
    favorites.includes(item.id)
  ) || [];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 animate-pulse">
        <h1 className="text-3xl md:text-4xl font-medium mb-8 w-48 h-10 bg-secondary rounded"></h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-80 bg-secondary rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-medium mb-8">Your Favorites</h1>
      
      {favoriteItems.length === 0 ? (
        <div className="text-center py-16 max-w-md mx-auto">
          <HeartOff className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
          <h2 className="text-2xl font-medium mb-4">No favorites yet</h2>
          <p className="text-muted-foreground mb-8">
            You haven't added any items to your favorites yet. Browse our menu and click the heart icon to add items you love.
          </p>
          <Button asChild size="lg" className="rounded-full px-8">
            <Link to="/menu">Browse Menu</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteItems.map((item: MenuItem) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
