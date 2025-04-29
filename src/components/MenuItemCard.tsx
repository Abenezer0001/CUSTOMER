
import React from 'react';
// Removed Link import as we'll trigger a drawer instead
import { MenuItem } from '@/types';
import { useFavorites } from '@/context/FavoritesContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Heart, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MenuItemCardProps {
  item: MenuItem;
  className?: string;
  onOpenDetail: (item: MenuItem) => void; // Add prop to handle opening the detail drawer
}

// TODO: Add quantity logic if needed later
// For now, just using the add button as per Negroni example

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, className, onOpenDetail }) => { // Destructure onOpenDetail
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { addItem } = useCart();
  const isFav = isFavorite(item.id);

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFav) {
      removeFavorite(item.id);
      toast.info(`Removed ${item.name} from favorites`);
    } else {
      addFavorite(item.id);
      toast.success(`Added ${item.name} to favorites`);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Instead of adding directly, open the detail drawer to allow modifier selection
    onOpenDetail(item);
    // addItem(item, 1); // Original direct add logic removed
  };

  // Generate a consistent image URL based on the item's category or search term
  const getImageUrl = () => {
    // Use the Foodish API for images
    const searchTerm = item.imageSearchTerm?.toLowerCase() || '';
    const category = searchTerm.includes('burger') ? 'burger' : 
                   searchTerm.includes('pasta') ? 'pasta' :
                   searchTerm.includes('pizza') ? 'pizza' :
                   searchTerm.includes('dessert') ? 'dessert' :
                   searchTerm.includes('chicken') ? 'butter-chicken' :
                   searchTerm.includes('rice') ? 'rice' : 'burger';
    
    // Use a deterministic number based on item id to get a consistent image
    const itemNum = parseInt(item.id.replace(/\D/g, '')) % 30 + 1;
    return `https://foodish-api.herokuapp.com/images/${category}/${category}${itemNum}.jpg`;
  };

  // Main card div now handles the click to open details
  return (
    <div
      className={cn(
        'relative group bg-card rounded-lg overflow-hidden flex flex-col h-full text-card-foreground shadow-md cursor-pointer', // Added cursor-pointer
        className
      )}
      onClick={() => onOpenDetail(item)} // Call the passed handler on click
    >
      {/* Favorite Button */}
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

      {/* Removed the Link component wrapper */}
      {/* Image Section */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <img
          src={item.image || `https://source.unsplash.com/random/300x200/?${item.imageSearchTerm || 'food'}`} // Use item's image
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getImageUrl();
            }}
          />
      </div>

      {/* Content Section */}
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

            {/* Add Button */}
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
      {/* Removed closing Link tag */}
    </div>
  );
};
