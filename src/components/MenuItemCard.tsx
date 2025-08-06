import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Star, Users } from 'lucide-react';
import { MenuItem, RatingStats } from '@/types';
import { useCart } from '@/context/CartContext';
import { useGroupOrder } from '@/context/GroupOrderContext';
import { toast } from 'sonner';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { ItemDetailDrawer } from '@/components/ItemDetailDrawer';
import ratingService from '@/api/ratingService';
import { cn } from '@/lib/utils';

interface MenuItemCardProps {
  item: MenuItem;
  className?: string;
  showDetailDrawer?: boolean;
  showRating?: boolean;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, className, showDetailDrawer = true, showRating = true }) => {
  const { addToCart } = useCart();
  const { isInGroupOrder, addItemToGroupCart } = useGroupOrder();
  const [isOpen, setIsOpen] = useState(false);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);
  
  // Fetch rating stats
  useEffect(() => {
    if (showRating) {
      const fetchRatingStats = async () => {
        setLoadingRating(true);
        try {
          const stats = await ratingService.getMenuItemRatingStats(item._id || item.id);
          setRatingStats(stats);
        } catch (error) {
          // Silently fail - no rating stats available
          console.log('No rating stats available for item:', item.name);
        } finally {
          setLoadingRating(false);
        }
      };
      
      fetchRatingStats();
    }
  }, [item.id, item._id, showRating]);
  
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const cartItem = {
      id: item._id || item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      description: item.description,
      quantity: 1,
      dateAdded: Date.now()
    };

    try {
      if (isInGroupOrder) {
        // Add to group cart
        await addItemToGroupCart(cartItem);
        toast.success(`${item.name} added to group cart`);
      } else {
        // Add to individual cart
        addToCart(cartItem);
        toast.success(`${item.name} added to cart`);
      }
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };
  
  // Format price
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(item.price);
  
  return (
    <div className="relative">
      {showDetailDrawer ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            <Card 
              className={`overflow-hidden cursor-pointer transition-all hover:shadow-md ${className || ''}`}
            >

        <div className="relative h-40 overflow-hidden">
          <img
            src={item.image || '/placeholder-item.jpg'}
            alt={item.name}
            className={cn(
              "w-full h-full object-cover",
              item.isActive === false && "opacity-50"
            )}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-item.jpg';
            }}
          />
          {item.featured && (
            <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
              Featured
            </div>
          )}
          {item.isActive === false && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center">
                <div className="text-white text-xs font-medium bg-black/70 px-3 py-1 rounded-full">
                  Currently Unavailable
                </div>
                {item.availabilityMessage && (
                  <div className="text-white text-xs mt-1 opacity-80">
                    {item.availabilityMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <CardContent className="p-3">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-medium text-base line-clamp-1">{item.name}</h3>
            <span className="font-semibold text-sm text-primary">{formattedPrice}</span>
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {item.description}
          </p>
          
          {/* Rating Display */}
          {showRating && ratingStats && ratingStats.totalReviews > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {ratingStats.averageRating.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({ratingStats.totalReviews})
              </span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            {/* Display tags if available */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {item.tags.slice(0, 2).map((tag, index) => (
                  <span 
                    key={index}
                    className="text-xs bg-muted px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            {/* Add to cart button(s) */}
            {item.isActive === false ? (
              <div className="ml-auto">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  Unavailable
                </span>
              </div>
            ) : isInGroupOrder ? (
              <div className="flex gap-2 ml-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 text-xs"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const cartItem = {
                      id: item._id || item.id,
                      name: item.name,
                      price: item.price,
                      image: item.image,
                      description: item.description,
                      quantity: 1,
                      dateAdded: Date.now()
                    };
                    addToCart(cartItem);
                    toast.success(`${item.name} added to your cart`);
                  }}
                >
                  My Cart
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleAddToCart}
                >
                  Group Cart
                </Button>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 ml-auto rounded-full bg-purple-600 hover:bg-purple-700 shadow-md"
                onClick={handleAddToCart}
              >
                <Plus className="h-5 w-5 text-white" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
          </DrawerTrigger>
          <DrawerContent>
            <ItemDetailDrawer item={item} onClose={() => setIsOpen(false)} />
          </DrawerContent>
        </Drawer>
      ) : (
        <Card 
          className={`overflow-hidden cursor-pointer transition-all hover:shadow-md ${className || ''}`}
          onClick={() => toast.info(`Selected: ${item.name}`)}
        >
          <div className="relative h-40 overflow-hidden">
            <img
              src={item.image || '/placeholder-item.jpg'}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-item.jpg';
              }}
            />
            {item.featured && (
              <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                Featured
              </div>
            )}
          </div>
          
          <CardContent className="p-3">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-medium text-base line-clamp-1">{item.name}</h3>
              <span className="font-semibold text-sm text-primary">{formattedPrice}</span>
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {item.description}
            </p>
            
            {/* Rating Display */}
            {showRating && ratingStats && ratingStats.totalReviews > 0 && (
              <div className="flex items-center gap-1 mb-2">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {ratingStats.averageRating.toFixed(1)}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({ratingStats.totalReviews})
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              {/* Display tags if available */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {item.tags.slice(0, 2).map((tag, index) => (
                    <span 
                      key={index}
                      className="text-xs bg-muted px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Add to cart button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 ml-auto rounded-full bg-purple-600 hover:bg-purple-700 shadow-md"
                onClick={handleAddToCart}
              >
                <Plus className="h-5 w-5 text-white" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MenuItemCard;
