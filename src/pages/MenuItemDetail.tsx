
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useFavorites } from '@/context/FavoritesContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, ArrowLeft, Plus, Minus, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

const MenuItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { addItem } = useCart();
  const [quantity, setQuantity] = React.useState(1);
  const [specialInstructions, setSpecialInstructions] = React.useState('');

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['menuItem', id],
    queryFn: () => api.getMenuItem(id!),
    enabled: !!id,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const handleQuantityChange = (amount: number) => {
    const newQuantity = quantity + amount;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (item) {
      addItem(item, quantity, specialInstructions);
    }
  };

  const handleFavoriteToggle = () => {
    if (!item) return;
    
    if (isFavorite(item.id)) {
      removeFavorite(item.id);
    } else {
      addFavorite(item.id);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 w-36 bg-secondary rounded mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-[4/3] rounded-xl bg-secondary"></div>
          <div className="space-y-4">
            <div className="h-10 bg-secondary rounded-md w-3/4"></div>
            <div className="h-6 bg-secondary rounded-md w-1/4"></div>
            <div className="h-24 bg-secondary rounded-md w-full"></div>
            <div className="h-10 bg-secondary rounded-md w-2/3"></div>
            <div className="h-10 bg-secondary rounded-md w-full mt-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-medium mb-4">Item not found</h2>
        <p className="text-muted-foreground mb-6">The menu item you're looking for doesn't exist or has been removed.</p>
        <Button onClick={handleBack}>Go Back</Button>
      </div>
    );
  }

  const isFav = isFavorite(item.id);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 animate-fade-in">
      <Button 
        variant="ghost" 
        onClick={handleBack} 
        className="mb-8 pl-0 hover:pl-1 transition-all"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <div className="relative overflow-hidden rounded-xl">
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-auto aspect-[4/3] object-cover rounded-xl"
          />
          
          {item.featured && (
            <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 text-sm font-medium rounded-full">
              Featured
            </div>
          )}
        </div>
        
        <div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl md:text-4xl font-medium mb-2">{item.name}</h1>
              <p className="text-xl font-medium text-primary mb-4">${item.price.toFixed(2)}</p>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "rounded-full transition-colors",
                isFav && "text-destructive border-destructive hover:bg-destructive/10"
              )}
              onClick={handleFavoriteToggle}
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={cn("h-5 w-5", isFav && "fill-destructive")} />
            </Button>
          </div>
          
          <div className="mb-6">
            <p className="text-muted-foreground mb-4">
              {item.description}
            </p>
            
            <div className="flex flex-wrap gap-2 mt-4">
              {item.tags?.map((tag) => (
                <span 
                  key={tag} 
                  className="text-xs px-3 py-1 bg-secondary rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="specialInstructions" className="block text-sm font-medium mb-2">
              Special Instructions
            </label>
            <Textarea
              id="specialInstructions"
              placeholder="Any special requests or allergies?"
              className="resize-none"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center border border-border rounded-full overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none h-10 w-10"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <span className="flex-1 text-center min-w-[40px]">{quantity}</span>
              
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none h-10 w-10"
                onClick={() => handleQuantityChange(1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <Button 
              className="flex-1 rounded-full" 
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart - ${(item.price * quantity).toFixed(2)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItemDetail;
