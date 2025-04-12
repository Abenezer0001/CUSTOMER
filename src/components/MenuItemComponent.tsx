import React, { useState } from 'react';
import { MenuItem } from '@/types';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Plus, Clock, X, MinusCircle, PlusCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// Define modifier types
interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

interface Modifier {
  id: string;
  name: string;
  type: 'radio' | 'checkbox';
  required?: boolean;
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
  
  // Use a backup image service if Unsplash fails
  const getFallbackImage = (searchTerm: string) => {
    return `https://foodish-api.herokuapp.com/images/burger/burger${Math.floor(Math.random() * 30) + 1}.jpg`;
  };
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <div className="relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-lg bg-background border border-border">
          {item.featured && (
            <span className="absolute top-2 right-2 bg-marian-blue text-white text-xs px-2 py-0.5 rounded-full z-10">
              Featured
            </span>
          )}
          <div className="aspect-[4/3] overflow-hidden">
            <img 
              src={item.image || `https://source.unsplash.com/random/300x200/?${item.imageSearchTerm || 'food'}`} 
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = getFallbackImage(item.imageSearchTerm || 'food');
              }}
            />
          </div>
          <div className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-foreground">{item.name}</h3>
                <p className="text-xs my-0.5 line-clamp-1 text-muted-foreground">{item.description}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-marian-blue">${item.price.toFixed(2)}</span>
                <div className="flex items-center mt-1 text-xs text-muted-foreground">
                  <Clock size={12} className="mr-1" />
                  <span>{item.preparationTime || '10-15 min'}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <Button 
                onClick={handleAddToCart}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-full bg-marian-blue hover:bg-marian-blue/90 text-white"
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>
        </div>
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-[85%] rounded-t-3xl p-0" 
        showClose={false}
        // Add animation properties for smoother transition
        style={{
          transform: 'translateY(100%)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        // Override default animation classes
        customCloseIcon={<></>}
        className="data-[state=open]:transform-none data-[state=open]:transition-transform data-[state=open]:duration-500"
      >
        <MenuItemDetail item={item} onAddToCart={handleAddToCart} />
      </SheetContent>
    </Sheet>
  );
};

interface MenuItemDetailProps {
  item: MenuItem;
  onAddToCart: (e: React.MouseEvent) => void;
}

// Dummy modifiers for the menu items
const getModifiersForItem = (itemId: string): Modifier[] => {
  // Generic modifiers that apply to most items
  const modifiers: Modifier[] = [];
  
  // Add spice level modifier for certain items
  if (['1', '3', '5'].includes(itemId)) {
    modifiers.push({
      id: 'spice-level',
      name: 'Spice Level',
      type: 'radio',
      required: true,
      options: [
        { id: 'mild', name: 'Mild', price: 0 },
        { id: 'medium', name: 'Medium', price: 0 },
        { id: 'hot', name: 'Hot 🔥', price: 0 },
        { id: 'extra-hot', name: 'Extra Hot 🔥🔥', price: 1 },
      ]
    });
  }
  
  // Add cheese modifier for certain items
  if (['2', '4', '12'].includes(itemId)) {
    modifiers.push({
      id: 'cheese',
      name: 'Cheese Options',
      type: 'radio',
      required: true,
      options: [
        { id: 'cheddar', name: 'Cheddar', price: 0 },
        { id: 'swiss', name: 'Swiss', price: 1 },
        { id: 'blue', name: 'Blue Cheese', price: 1.5 },
        { id: 'no-cheese', name: 'No Cheese', price: -1 },
      ]
    });
  }
  
  // Add toppings for burgers and pizzas
  if (['2', '12'].includes(itemId)) {
    modifiers.push({
      id: 'toppings',
      name: 'Extra Toppings',
      type: 'checkbox',
      options: [
        { id: 'bacon', name: 'Bacon', price: 2 },
        { id: 'avocado', name: 'Avocado', price: 1.5 },
        { id: 'egg', name: 'Fried Egg', price: 1 },
        { id: 'jalapeños', name: 'Jalapeños', price: 0.5 },
        { id: 'mushrooms', name: 'Mushrooms', price: 1 },
      ]
    });
  }
  
  // Add sides for main courses
  if (['3', '4', '5'].includes(itemId)) {
    modifiers.push({
      id: 'sides',
      name: 'Side Options',
      type: 'radio',
      required: true,
      options: [
        { id: 'fries', name: 'French Fries', price: 0 },
        { id: 'salad', name: 'Side Salad', price: 0 },
        { id: 'mashed', name: 'Mashed Potatoes', price: 0 },
        { id: 'truffle-fries', name: 'Truffle Fries', price: 3 },
        { id: 'none', name: 'No Side', price: -3 },
      ]
    });
  }
  
  return modifiers;
};

const MenuItemDetail: React.FC<MenuItemDetailProps> = ({ item, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string | string[]>>({});
  const [totalPrice, setTotalPrice] = useState(item.price);
  
  // Get modifiers for this item
  const modifiers = getModifiersForItem(item.id);
  
  // Handle radio modifier change
  const handleRadioChange = (modifierId: string, optionId: string) => {
    // Find the option to get its price
    const modifier = modifiers.find(m => m.id === modifierId);
    const option = modifier?.options.find(o => o.id === optionId);
    
    // Calculate price difference between old and new selection
    let priceDifference = 0;
    const oldOptionId = selectedModifiers[modifierId] as string;
    if (oldOptionId) {
      const oldOption = modifier?.options.find(o => o.id === oldOptionId);
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
    const modifier = modifiers.find(m => m.id === modifierId);
    const option = modifier?.options.find(o => o.id === optionId);
    
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
    return `https://foodish-api.herokuapp.com/images/burger/burger${Math.floor(Math.random() * 30) + 1}.jpg`;
  };
  
  return (
    <div className="h-full overflow-auto">
      {/* Close button at the top */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-black/30 hover:bg-black/50 text-white"
          onClick={() => document.querySelector('.close-sheet-trigger')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}
        >
          <X size={18} />
        </Button>
      </div>
      
      <div className="relative h-64">
        <img 
          src={item.image || `https://source.unsplash.com/random/800x600/?${item.imageSearchTerm || 'food'}`} 
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getFallbackImage(item.imageSearchTerm || 'food');
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night to-transparent"></div>
      </div>
      
      <div className="relative -mt-12 px-4 pt-0 pb-6 rounded-t-3xl bg-background z-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground">{item.name}</h2>
          <span className="text-lg font-bold text-marian-blue">${totalPrice.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center text-muted-foreground">
            <Clock size={16} className="mr-1" />
            <span className="text-sm">{item.preparationTime || '10-15 min'}</span>
          </div>
          {item.nutritionInfo?.calories && (
            <div className="text-sm text-muted-foreground">
              {item.nutritionInfo.calories} calories
            </div>
          )}
        </div>
        
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {item.tags.map(tag => (
              <span 
                key={tag} 
                className="text-xs px-2 py-1 rounded-full bg-delft-blue/10 text-delft-blue"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <p className="text-muted-foreground mb-6">{item.description}</p>
        
        {/* Modifiers */}
        {modifiers.length > 0 && (
          <div className="mb-6 space-y-6">
            {modifiers.map(modifier => (
              <div key={modifier.id} className="space-y-3">
                <div className="flex justify-between">
                  <h3 className="font-medium">
                    {modifier.name}
                    {modifier.required && <span className="text-xs text-red-500 ml-1">*</span>}
                  </h3>
                </div>
                
                {modifier.type === 'radio' ? (
                  <RadioGroup 
                    defaultValue={selectedModifiers[modifier.id] as string || modifier.options[0].id}
                    onValueChange={(value) => handleRadioChange(modifier.id, value)}
                  >
                    <div className="grid grid-cols-1 gap-2">
                      {modifier.options.map(option => (
                        <div key={option.id} className="flex items-center justify-between space-x-2 border border-border rounded-lg p-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value={option.id} 
                              id={`${modifier.id}-${option.id}`} 
                              className="text-marian-blue border-marian-blue"
                            />
                            <Label htmlFor={`${modifier.id}-${option.id}`}>
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
                    {modifier.options.map(option => {
                      const isChecked = (selectedModifiers[modifier.id] as string[] || []).includes(option.id);
                      return (
                        <div key={option.id} className="flex items-center justify-between space-x-2 border border-border rounded-lg p-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`${modifier.id}-${option.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => handleCheckboxChange(modifier.id, option.id, checked === true)}
                              className="text-marian-blue border-marian-blue data-[state=checked]:bg-marian-blue data-[state=checked]:border-marian-blue"
                            />
                            <Label htmlFor={`${modifier.id}-${option.id}`}>
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
        <div className="flex items-center justify-between mb-6 mt-6">
          <span className="font-medium">Quantity</span>
          <div className="flex items-center space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-full border-marian-blue text-marian-blue"
              onClick={handleDecrementQuantity}
              disabled={quantity <= 1}
            >
              <MinusCircle size={16} />
            </Button>
            <span className="font-medium w-6 text-center">{quantity}</span>
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-full border-marian-blue text-marian-blue"
              onClick={handleIncrementQuantity}
            >
              <PlusCircle size={16} />
            </Button>
          </div>
        </div>
        
        {/* Total and add to cart */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm text-muted-foreground">Total price</span>
            <div className="text-xl font-bold text-marian-blue">${(totalPrice * quantity).toFixed(2)}</div>
          </div>
          <Button 
            onClick={onAddToCart}
            className="rounded-full px-6 bg-marian-blue hover:bg-marian-blue/90 text-white"
          >
            <Plus size={18} className="mr-2" />
            Add to Order
          </Button>
        </div>
      </div>
    </div>
  );
};
