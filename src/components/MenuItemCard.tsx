
import React from 'react';
import { Link } from 'react-router-dom';
import { MenuItem } from '@/types';
import { useFavorites } from '@/context/FavoritesContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Heart, Plus, Minus } from 'lucide-react'; // Added Minus
import { cn } from '@/lib/utils';

interface MenuItemCardProps {
  item: MenuItem;
  className?: string;
}

// TODO: Add quantity logic if needed later
// For now, just using the add button as per Negroni example

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, className }) => {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { addItem } = useCart(); // Removed getItemQuantity and updateItemQuantity
  const isFav = isFavorite(item.id);
  // const quantity = getItemQuantity(item.id); // Removed quantity logic for now

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

  // Placeholder functions for quantity adjustment if needed later
  // const handleIncrease = (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   updateItemQuantity(item.id, quantity + 1);
  // };

  // const handleDecrease = (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   if (quantity > 0) {
  //     updateItemQuantity(item.id, quantity - 1);
  //   }
  // };

  return (
    <div // Changed Link to div to prevent nested interactive elements if quantity controls are added later
      className={cn(
        'relative group bg-card rounded-lg overflow-hidden flex flex-col h-full text-card-foreground shadow-md', // Use card background/foreground
        className
      )}
    >
      {/* Favorite Button - Positioned relative to the card */}
      <button
        className={cn(
          'absolute top-2 right-2 z-10 p-1.5 rounded-full transition-colors duration-200',
          isFav ? 'text-destructive' : 'text-muted-foreground hover:text-foreground' // Use destructive for fav, muted for inactive
        )}
        onClick={handleFavoriteToggle}
        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart size={20} className={isFav ? 'fill-current' : ''} />
      </button>

      <Link to={`/menu/${item.id}`} className="block flex flex-col h-full">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <img
            src={item.image} // Use item's image
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        <div className="p-2.5 flex flex-col flex-grow">
          <div className="flex-grow mb-2">
            <h3 className="font-semibold text-sm mb-1 truncate" title={item.name}>
              {item.name}
            </h3>
            {/* Added volume/description - using description or default */}
            <p className="text-muted-foreground text-xs"> {/* Use muted foreground */}
              {item.description?.split(' ').slice(0, 2).join(' ') || '70 ml'}
            </p>
          </div>

          <div className="flex justify-between items-center mt-auto">
            <span className="font-semibold text-sm">
              {/* Formatting price to match reference (e.g., 590 ₽) */}
              {item.price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>

            {/* Add Button - Use marian-blue */}
            <Button
              size="icon"
              className="h-8 w-8 rounded-md bg-marian-blue hover:bg-marian-blue/90 text-primary-foreground" // Use marian-blue and primary-foreground
              onClick={handleAdd}
              aria-label="Add to cart"
            >
              <Plus size={18} />
            </Button>

            {/* Quantity Controls (Example - keep commented out for now, update colors if used) */}
            {/* {quantity > 0 ? (
              <div className="flex items-center gap-1 bg-marian-blue rounded-md"> // Use marian-blue
                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-marian-blue/80" onClick={handleDecrease}><Minus size={16} /></Button>
                <span className="font-medium text-sm text-primary-foreground w-4 text-center">{quantity}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-marian-blue/80" onClick={handleIncrease}><Plus size={16} /></Button>
              </div>
            ) : (
              <Button
                size="icon"
                className="h-8 w-8 rounded-md bg-marian-blue hover:bg-marian-blue/90 text-primary-foreground" // Use marian-blue
                onClick={handleAdd}
                aria-label="Add to cart"
              >
                <Plus size={18} />
              </Button>
            )} */}
          </div>
        </div>
      </Link>
    </div>
  );
};
