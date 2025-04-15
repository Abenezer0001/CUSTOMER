
import React from 'react';
import { Link } from 'react-router-dom';
import { MenuItem } from '@/types';
import { useFavorites } from '@/context/FavoritesContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Heart, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItemCardProps {
  item: MenuItem;
  className?: string;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, className }) => {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { addItem } = useCart();
  const isFav = isFavorite(item.id);

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFav) {
      removeFavorite(item.id);
    } else {
      addFavorite(item.id);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(item, 1);
  };

  // Get fallback image if needed
  const getFallbackImage = (searchTerm: string) => {
    return `https://foodish-api.herokuapp.com/images/burger/burger${Math.floor(Math.random() * 30) + 1}.jpg`;
  };

  return (
    <div
      className={cn(
        'relative group bg-card rounded-lg overflow-hidden flex flex-col h-full text-card-foreground shadow-md',
        className
      )}
    >
      {/* Favorite Button - Positioned relative to the card */}
      <button
        className={cn(
          'absolute top-2 right-2 z-10 p-1.5 rounded-full transition-colors duration-200',
          isFav ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={handleFavoriteToggle}
        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart size={20} className={isFav ? 'fill-current' : ''} />
      </button>

      <Link to={`/menu/${item.id}`} className="block flex flex-col h-full">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <img
            src={item.image || `https://source.unsplash.com/random/300x200/?${item.imageSearchTerm || 'food'}`}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getFallbackImage(item.imageSearchTerm || 'food');
            }}
          />
        </div>

        <div className="p-2.5 flex flex-col flex-grow">
          <div className="flex-grow mb-2">
            <h3 className="font-semibold text-sm mb-1 truncate" title={item.name}>
              {item.name}
            </h3>
            {/* Display first few words of description or a generic placeholder */}
            <p className="text-muted-foreground text-xs">
              {item.description ? `${item.description.split(' ').slice(0, 3).join(' ')}...` : 'View details'}
            </p>
          </div>

          <div className="flex justify-between items-center mt-auto">
            <span className="font-semibold text-sm">
              ${item.price.toFixed(2)}
            </span>

            {/* Add Button - Use marian-blue */}
            <Button
              size="icon"
              className="h-8 w-8 rounded-full bg-marian-blue hover:bg-marian-blue/90 text-primary-foreground"
              onClick={handleAdd}
              aria-label="Add to cart"
            >
              <Plus size={18} />
            </Button>
          </div>
        </div>
      </Link>
    </div>
  );
};
