import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { MenuItem } from '@/types';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { ItemDetailDrawer } from '@/components/ItemDetailDrawer';

interface MenuItemCardProps {
  item: MenuItem;
  className?: string;
  showDetailDrawer?: boolean;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, className, showDetailDrawer = true }) => {
  const { addToCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Add to cart functionality
    addToCart({
      id: item._id || item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      description: item.description
    });
    toast.success(`${item.name} added to cart`);
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
