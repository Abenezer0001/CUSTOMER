import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useFavorites } from '@/context/FavoritesContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, ArrowLeft, Plus, Minus, ShoppingCart, Clock, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MenuItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { addItem } = useCart();
  const [quantity, setQuantity] = React.useState(1);
  const [specialInstructions, setSpecialInstructions] = React.useState('');
  const [isJsonFallback, setIsJsonFallback] = useState(false);

  // Try to fetch from API first
  const { data: item, isLoading, error } = useQuery({
    queryKey: ['menuItem', id],
    queryFn: async () => {
      try {
        const apiItem = await api.getMenuItem(id!);
        return apiItem;
      } catch (err) {
        console.error("API fetch failed, falling back to JSON", err);
        setIsJsonFallback(true);
        // Fallback to JSON file
        const response = await fetch('/src/data/menu-items.json');
        if (!response.ok) throw new Error("Failed to load data");
        const data = await response.json();
        const foundItem = data.items.find((item: any) => item.id === id);
        if (!foundItem) throw new Error("Item not found");
        return foundItem;
      }
    },
    retry: false,
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
      addItem(
        item, 
        quantity, 
        undefined,
        undefined,
        specialInstructions
      );
      toast.success(`Added ${item.name} to cart`);
    }
  };

  const handleFavoriteToggle = () => {
    if (!item) return;
    
    if (isFavorite(item.id)) {
      removeFavorite(item.id);
      toast.info(`Removed ${item.name} from favorites`);
    } else {
      addFavorite(item.id);
      toast.success(`Added ${item.name} to favorites`);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Get food image using Foodish API
  const getFoodImage = (searchTerm: string) => {
    // Use foodish API - a free food image API
    // Categories: biryani, burger, butter-chicken, dessert, dosa, idly, pasta, pizza, rice, samosa
    const category = searchTerm?.includes('burger') ? 'burger' : 
                     searchTerm?.includes('pasta') ? 'pasta' :
                     searchTerm?.includes('pizza') ? 'pizza' :
                     searchTerm?.includes('dessert') ? 'dessert' :
                     searchTerm?.includes('chicken') ? 'butter-chicken' :
                     searchTerm?.includes('rice') ? 'rice' : 'burger';
                     
    return `https://foodish-api.herokuapp.com/images/${category}/${category}${Math.floor(Math.random() * 30) + 1}.jpg`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 mt-14">
        <div className="animate-pulse">
          <div className="h-6 w-24 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 w-full bg-gray-200 rounded-xl mb-6"></div>
          <div className="h-8 w-3/4 bg-gray-200 rounded mb-3"></div>
          <div className="h-6 w-1/4 bg-gray-200 rounded mb-4"></div>
          <div className="h-24 w-full bg-gray-200 rounded mb-6"></div>
          <div className="flex space-x-2 mb-6">
            <div className="h-6 w-16 bg-gray-200 rounded"></div>
            <div className="h-6 w-16 bg-gray-200 rounded"></div>
          </div>
          <div className="h-32 w-full bg-gray-200 rounded mb-6"></div>
          <div className="h-12 w-full bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container mx-auto px-4 py-8 mt-14 text-center">
        <h2 className="text-xl font-medium mb-4">Item not found</h2>
        <p className="text-muted-foreground mb-6">The menu item you're looking for doesn't exist or has been removed.</p>
        <Button onClick={handleBack}>Go Back</Button>
      </div>
    );
  }

  const isFav = isFavorite(item.id);

  return (
    <div className="container mx-auto px-4 py-4 mt-14 animate-fade-in pb-20">
      {isJsonFallback && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs">
          Using locally cached data. Some features may be limited.
        </div>
      )}
      
      <Button 
        variant="ghost" 
        onClick={handleBack} 
        className="mb-4 pl-0 hover:pl-1 transition-all"
        size="sm"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
        <div className="relative">
          <img 
            src={item.image || getFoodImage(item.imageSearchTerm || 'food')}
            alt={item.name} 
            className="w-full h-60 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getFoodImage(item.imageSearchTerm || 'food');
            }}
          />
          
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "absolute top-4 right-4 rounded-full bg-white/90 backdrop-blur-sm transition-colors",
              isFav ? "text-red-500 border-red-500 hover:bg-red-50" : "text-gray-500 hover:text-red-500"
            )}
            onClick={handleFavoriteToggle}
          >
            <Heart className={cn("h-5 w-5", isFav && "fill-red-500")} />
          </Button>
          
          {item.featured && (
            <div className="absolute top-4 left-4 bg-emerald-500 text-white px-3 py-1 text-xs font-medium rounded-full">
              Featured
            </div>
          )}
        </div>
        
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-2xl font-medium">{item.name}</h1>
            <span className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              ${item.price.toFixed(2)}
            </span>
          </div>
          
          <div className="flex items-center gap-4 mb-3">
            {item.nutritionInfo?.calories && (
              <div className="inline-flex items-center text-xs text-gray-500">
                <span className="mr-1 text-emerald-500">•</span>
                {item.nutritionInfo.calories} kcal
              </div>
            )}
            
            {item.preparationTime && (
              <div className="inline-flex items-center text-xs text-gray-500">
                <Clock className="mr-1 h-3 w-3 text-emerald-500" />
                {item.preparationTime}
              </div>
            )}
            
            {item.rating && (
              <div className="inline-flex items-center text-xs text-gray-500">
                <span className="mr-1 text-amber-400">★</span>
                {item.rating}
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {item.description}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-5">
            {item.tags?.map((tag) => (
              <div 
                key={tag} 
                className="inline-flex items-center bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-xs"
              >
                <Tag className="mr-1 h-3 w-3 text-emerald-500" />
                {tag}
              </div>
            ))}
          </div>
          
          <div className="mb-4">
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
          
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-full overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <span className="w-9 text-center text-sm font-medium">{quantity}</span>
              
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => handleQuantityChange(1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <Button 
              className="rounded-full bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 px-8" 
              onClick={handleAddToCart}
            >
              Add to cart - ${(item.price * quantity).toFixed(2)}
            </Button>
          </div>
          
          {item.nutritionInfo && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
              <h3 className="font-medium text-sm mb-2">Nutrition Information</h3>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2">
                  <div className="text-xs text-gray-500">Protein</div>
                  <div className="font-medium">{item.nutritionInfo.protein}</div>
                </div>
                <div className="text-center p-2">
                  <div className="text-xs text-gray-500">Carbs</div>
                  <div className="font-medium">{item.nutritionInfo.carbs}</div>
                </div>
                <div className="text-center p-2">
                  <div className="text-xs text-gray-500">Fats</div>
                  <div className="font-medium">{item.nutritionInfo.fats}</div>
                </div>
                <div className="text-center p-2">
                  <div className="text-xs text-gray-500">Calories</div>
                  <div className="font-medium">{item.nutritionInfo.calories}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuItemDetail;
