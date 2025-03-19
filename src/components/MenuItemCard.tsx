
import React from 'react';
import { Link } from 'react-router-dom';
import { MenuItem } from '@/types';
import { useFavorites } from '@/context/FavoritesContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart, Plus } from 'lucide-react';
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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(item, 1);
  };

  return (
    <Link 
      to={`/menu/${item.id}`}
      className={cn(
        'product-card group bg-card border border-border/50 flex flex-col h-full',
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Favorite Button */}
        <button
          className={cn(
            'btn-floating absolute top-2 right-2 transition-all duration-300',
            isFav
              ? 'bg-destructive text-white hover:bg-destructive/90'
              : 'bg-background/80 backdrop-blur-sm text-foreground hover:bg-background'
          )}
          onClick={handleFavoriteToggle}
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={16} className={isFav ? 'fill-current' : ''} />
        </button>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex-grow">
          <div className="flex items-start justify-between">
            <h3 className="font-medium mb-1 group-hover:text-primary transition-colors duration-300">
              {item.name}
            </h3>
            <span className="font-medium text-foreground">${item.price.toFixed(2)}</span>
          </div>
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{item.description}</p>
        </div>
        
        <div className="flex justify-between items-center mt-auto">
          <div className="flex flex-wrap gap-1">
            {item.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                {tag}
              </span>
            ))}
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleAddToCart}
            aria-label="Add to cart"
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>
    </Link>
  );
};
