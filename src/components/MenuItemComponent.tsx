import React, { useState } from 'react';
import { MenuItem } from '@/types';
import { Dialog, DialogContent, DialogTitle, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { Plus, Clock, X, MinusCircle, PlusCircle, Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// Define modifier types for API compatibility
interface ModifierOption {
  _id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  isDefault?: boolean;
}

interface Modifier {
  _id: string;
  name: string;
  selectionType: 'SINGLE' | 'MULTIPLE';
  isRequired?: boolean;
  options: ModifierOption[];
}

interface MenuItemComponentProps {
  item: MenuItem;
}

export const MenuItemComponent: React.FC<MenuItemComponentProps> = ({ item }) => {
  const { addItem } = useCart();
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(item, 1);
    toast.success(`Added ${item.name} to cart`);
  };
  
  // Use stock images from Pexels instead of Unsplash
  const getFallbackImage = (searchTerm: string) => {
    // Map of food categories to Pexels stock images
    const stockImages: Record<string, string> = {
      food: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
      burger: 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg',
      pizza: 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg',
      pasta: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg',
      steak: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg',
      salad: 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg',
      dessert: 'https://images.pexels.com/photos/132694/pexels-photo-132694.jpeg',
      coffee: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
      tea: 'https://images.pexels.com/photos/1793035/pexels-photo-1793035.jpeg',
      cocktail: 'https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg',
      beer: 'https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg',
      wine: 'https://images.pexels.com/photos/1470720/pexels-photo-1470720.jpeg',
      alcohol: 'https://images.pexels.com/photos/339696/pexels-photo-339696.jpeg',
      drink: 'https://images.pexels.com/photos/2789328/pexels-photo-2789328.jpeg',
      appetizer: 'https://images.pexels.com/photos/566566/pexels-photo-566566.jpeg',
      noodles: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg',
      sliders: 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg',
      sandwich: 'https://images.pexels.com/photos/1647163/pexels-photo-1647163.jpeg',
      sides: 'https://images.pexels.com/photos/1640773/pexels-photo-1640773.jpeg',
      veggie: 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg',
      cheeseburger: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg',
      mushroom: 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg',
    };
    
    // Find the closest matching category or default to food
    const category = Object.keys(stockImages).find(cat => 
      searchTerm?.toLowerCase().includes(cat)) || 'food';
    
    return stockImages[category];
  };
  
  const [isFavorite, setIsFavorite] = useState(false);
  
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? `Removed ${item.name} from favorites` : `Added ${item.name} to favorites`);
  };

  return (
    <Dialog>
      <DialogTitle className="sr-only">{item.name}</DialogTitle>
      <DialogTrigger asChild>
        <button className="relative overflow-hidden w-full text-left rounded-xl transition-all duration-300 hover:shadow-lg bg-[#2D303E] border border-[#3F4156]">
        {item.featured && (
          <span className="absolute top-2 left-2 bg-[#7B61FF] text-white text-xs px-2 py-0.5 rounded-full z-10">
            Featured
          </span>
        )}
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavorite(e);
          }}
          className="absolute top-2 right-2 z-20 bg-black/40 hover:bg-black/60 rounded-full p-1.5 transition-all"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={isFavorite ? "#7B61FF" : "none"}
            stroke={isFavorite ? "#7B61FF" : "white"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>
        
        <div className="aspect-[4/3] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-[1]"></div>
          <img 
            src={item.image || getFallbackImage(item.name.toLowerCase())} 
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getFallbackImage(item.name.toLowerCase() || item.category || 'food');
            }}
          />
        </div>
        <div className="p-3 relative -mt-2 z-[2]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-white">{item.name}</h3>
              <p className="text-xs my-0.5 line-clamp-1 text-gray-300">{item.description}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-[#7B61FF]">${item.price.toFixed(2)}</span>
              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                <Clock size={12} className="mr-1" />
                <span>{'10-15 min'}</span>
              </div>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart(e);
              }}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-full bg-[#7B61FF] hover:bg-[#8E79FF] text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </button>
      </DialogTrigger>
      <DialogContent className="fixed top-[10vh] left-0 right-0 max-w-none p-0 h-[90vh] rounded-t-3xl bg-[#1F1D2B] border-t border-[#2D303E] overflow-hidden shadow-2xl z-50" style={{ transform: 'translateY(-100%)', animation: 'slide-down 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards', transformOrigin: 'top' }}>
        <MenuItemDetail item={item} onAddToCart={handleAddToCart} />
      </DialogContent>
    </Dialog>
  );
};

interface MenuItemDetailProps {
  item: MenuItem;
  onAddToCart: (e: React.MouseEvent) => void;
}


const MenuItemDetail: React.FC<MenuItemDetailProps> = ({ item, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string | string[]>>({});
  const [totalPrice, setTotalPrice] = useState(item.price);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const { addItem } = useCart();
  
  // Get modifiers for this item from API data
  const modifiers = item.modifierGroups || [];
  
  // Handle radio modifier change
  const handleRadioChange = (modifierId: string, optionId: string) => {
    // Find the option to get its price
    const modifier = modifiers.find(m => m._id === modifierId);
    const option = modifier?.options.find(o => o._id === optionId);
    
    // Calculate price difference between old and new selection
    let priceDifference = 0;
    const oldOptionId = selectedModifiers[modifierId] as string;
    if (oldOptionId) {
      const oldOption = modifier?.options.find(o => o._id === oldOptionId);
      if (oldOption) priceDifference -= oldOption.price;
    }
    if (option) priceDifference += option.price;
    
    // Update selected modifiers
    setSelectedModifiers(prev => ({
      ...prev,
      [modifierId]: optionId
    }));
    
    // Update total price
    setTotalPrice(prev => prev + priceDifference);
  };
  
  // Handle checkbox modifier change
  const handleCheckboxChange = (modifierId: string, optionId: string, checked: boolean) => {
    const modifier = modifiers.find(m => m._id === modifierId);
    const option = modifier?.options.find(o => o._id === optionId);
    
    // Update selected modifiers
    setSelectedModifiers(prev => {
      const current = prev[modifierId] as string[] || [];
      
      if (checked) {
        return {
          ...prev,
          [modifierId]: [...current, optionId]
        };
      } else {
        return {
          ...prev,
          [modifierId]: current.filter(id => id !== optionId)
        };
      }
    });
    
    // Update total price
    if (option) {
      setTotalPrice(prev => checked ? prev + option.price : prev - option.price);
    }
  };
  
  // Handle quantity change
  const handleDecrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };
  
  const handleIncrementQuantity = () => {
    setQuantity(quantity + 1);
  };
  
  // Get fallback image if Unsplash fails
  const getFallbackImage = (searchTerm: string) => {
    // Use reliable Pexels images instead of unreliable foodish-api
    return 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg';
  };
  
  return (
    <div className="h-full flex flex-col">
      <SheetPrimitive.Title id="menu-item-detail-title" className="sr-only">{item.name} Details</SheetPrimitive.Title>
      {/* Close button at the top */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-[#16141F]/50 hover:bg-[#16141F]/70 text-white"
          onClick={() => document.querySelector('[data-radix-collection-item]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}
        >
          <X size={18} />
        </Button>
      </div>
      
      <div className="relative h-40">
        <img 
          src={item.image || getFallbackImage(item.name.toLowerCase())} 
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getFallbackImage(item.name.toLowerCase() || item.category || 'food');
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#16141F]/70 to-transparent"></div>
      </div>
      
      <div className="relative -mt-12 px-4 pt-4 pb-20 rounded-t-3xl z-10 flex-1 overflow-y-auto" style={{ backgroundColor: '#2D303E' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 id="menu-item-title" className="text-xl font-bold text-white">{item.name}</h2>
          <span className="text-lg font-bold text-[#7B61FF]">${totalPrice.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={14} className="mr-1" />
            <span>{'10-15 min'}</span>
          </div>
        </div>
        
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {item.tags.map(tag => (
              <span 
                key={tag} 
                className="text-xs px-2 py-1 rounded-full text-[#7B61FF]"  
                style={{ backgroundColor: 'rgba(123, 97, 255, 0.15)', color: '#7B61FF' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <p id="menu-item-description" className="text-gray-300 mb-4">{item.description}</p>
        
        {/* Modifiers */}
        {modifiers.length > 0 && (
          <div className="mb-4 space-y-4 max-h-[40vh] overflow-y-auto pr-1">
            {modifiers.map(modifier => (
              <div key={modifier._id} className="space-y-3">
                <div className="flex justify-between">
                  <h3 className="font-medium">
                    {modifier.name}
                    {modifier.isRequired && <span className="text-xs text-red-500 ml-1">*</span>}
                  </h3>
                </div>
                
                {modifier.selectionType === 'SINGLE' ? (
                  <RadioGroup 
                    defaultValue={selectedModifiers[modifier._id] as string || modifier.options.find(o => o.isDefault)?._id || modifier.options[0]?._id}
                    onValueChange={(value) => handleRadioChange(modifier._id, value)}
                  >
                    <div className="grid grid-cols-1 gap-2">
                      {modifier.options.filter(option => option.isAvailable).map(option => (
                        <div key={option._id} className="flex items-center justify-between space-x-2 border border-border rounded-lg p-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value={option._id} 
                              id={`${modifier._id}-${option._id}`} 
                              className="text-marian-blue border-marian-blue"
                            />
                            <Label htmlFor={`${modifier._id}-${option._id}`}>
                              {option.name}
                            </Label>
                          </div>
                          <span className="text-sm font-medium">
                            {option.price === 0 
                              ? 'Included' 
                              : option.price > 0 
                                ? `+$${option.price.toFixed(2)}` 
                                : `-$${Math.abs(option.price).toFixed(2)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {modifier.options.filter(option => option.isAvailable).map(option => {
                      const isChecked = (selectedModifiers[modifier._id] as string[] || []).includes(option._id);
                      return (
                        <div key={option._id} className="flex items-center justify-between space-x-2 border border-border rounded-lg p-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`${modifier._id}-${option._id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => handleCheckboxChange(modifier._id, option._id, checked === true)}
                              className="text-marian-blue border-marian-blue data-[state=checked]:bg-marian-blue data-[state=checked]:border-marian-blue"
                            />
                            <Label htmlFor={`${modifier._id}-${option._id}`}>
                              {option.name}
                            </Label>
                          </div>
                          <span className="text-sm font-medium">
                            +${option.price.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Quantity selector */}
        <div className="flex items-center justify-between mb-4 mt-4">
          <span className="font-medium text-white">Quantity</span>
          <div className="flex items-center space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 rounded-full border-[#7B61FF] text-[#7B61FF] hover:bg-[#3A3A61]/20"
              onClick={handleDecrementQuantity}
              disabled={quantity <= 1}
            >
              <MinusCircle size={18} />
            </Button>
            <span className="font-bold text-lg w-8 text-center text-white">{quantity}</span>
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 rounded-full border-[#7B61FF] text-[#7B61FF] hover:bg-[#3A3A61]/20"
              onClick={handleIncrementQuantity}
            >
              <PlusCircle size={18} />
            </Button>
          </div>
        </div>
        
        {/* Special Instructions */}
        <div className="mb-6">
          <label htmlFor="special-instructions" className="block text-sm font-medium text-white mb-2">
            Special Instructions
          </label>
          <textarea
            id="special-instructions"
            rows={3}
            className="w-full rounded-md bg-[#2D303E] border border-[#3F4156] text-white p-3 text-sm"
            placeholder="Any special requests or notes for this item?"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
          />
        </div>
        
      </div>
      
      {/* Total and add to cart - fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#1F1D2B] pt-3 pb-6 border-t border-[#3A3A61]/30 shadow-lg z-20 px-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-muted-foreground">Total price</span>
            <div className="text-xl font-bold text-[#7B61FF]">${(totalPrice * quantity).toFixed(2)}</div>
          </div>
          <Button 
            onClick={(e) => {
              // Format modifiers for cart
              const cartModifiers = Object.entries(selectedModifiers).map(([groupId, selection]) => {
                const modifier = modifiers.find(m => m._id === groupId);
                if (Array.isArray(selection)) {
                  return selection.map(optionId => {
                    const option = modifier?.options.find(o => o._id === optionId);
                    return {
                      id: option?.name || optionId,
                      name: option?.name || '',
                      price: option?.price || 0,
                      groupId: groupId,
                      optionId: optionId
                    };
                  });
                } else {
                  const option = modifier?.options.find(o => o._id === selection);
                  return {
                    id: option?.name || selection,
                    name: option?.name || '',
                    price: option?.price || 0,
                    groupId: groupId,
                    optionId: selection
                  };
                }
              }).flat();
              
              // Use the cart's addItem function
              addItem(
                item,
                quantity,
                cartModifiers.length > 0 ? cartModifiers : undefined,
                undefined,
                specialInstructions
              );
              
              // Close modal if there's an onAddToCart callback
              if (onAddToCart) {
                onAddToCart(e);
              }
            }}
            className="rounded-full px-8 py-6 h-auto bg-[#7B61FF] hover:bg-[#7B61FF]/90 text-white"
          >
            <Plus size={18} className="mr-2" />
            Add to Order
          </Button>
        </div>
      </div>
    </div>
  );
};
