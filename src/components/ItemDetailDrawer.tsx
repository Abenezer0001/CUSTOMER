import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, CartItemModifier, MenuItemModifierGroup, ModifierOption } from '@/types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { DrawerClose } from './ui/drawer';
import { Clock, X, Minus, Plus, ShoppingCart, Star, Tag, Check } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { useCart } from '@/context/CartContext';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ItemDetailDrawerProps {
  item: MenuItem;
  onClose?: () => void; // Made optional since we can use DrawerClose
}

export const ItemDetailDrawer: React.FC<ItemDetailDrawerProps> = ({ item, onClose }) => {
  const { addItem } = useCart();
  // State to track selected modifiers: Key is group.name, Value is ModifierOption or ModifierOption[]
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, ModifierOption | ModifierOption[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Calculate total price using useMemo for efficiency
  const totalPrice = useMemo(() => {
    try {
      let calculatedPrice = item.price;
      Object.values(selectedModifiers).forEach(modOrMods => {
        if (Array.isArray(modOrMods)) {
          // Sum prices of selected options in a multi-select group
          calculatedPrice += modOrMods.reduce((sum, mod) => sum + (mod?.price || 0), 0);
        } else if (modOrMods) {
          // Add price of the selected option in a single-select group
          calculatedPrice += modOrMods.price || 0;
        }
      });
      return calculatedPrice * quantity;
    } catch (err) {
      console.error("Error calculating price:", err);
      return item.price * quantity; // Fallback to base price if calculation fails
    }
  }, [selectedModifiers, quantity, item.price]);

  // Handle modifier selection based on group type
  const handleModifierChange = (
    group: MenuItemModifierGroup,
    option: ModifierOption, // Now receiving the specific option
    checked: boolean | string // Checkbox sends boolean, RadioGroup sends value string (option.name)
  ) => {
    try {
      setSelectedModifiers(prev => {
        const newSelection = { ...prev };
        const groupId = group._id || group.name; // Use group _id as key, fallback to name
        const currentGroupSelection = newSelection[groupId];

        if (group.selectionType === 'MULTIPLE' || (group as any).type === 'multi-select') {
          const currentArray = Array.isArray(currentGroupSelection) ? currentGroupSelection : [];
          if (checked === true) {
            // Add option if checked
            newSelection[groupId] = [...currentArray, option];
          } else {
            // Remove option if unchecked
            newSelection[groupId] = currentArray.filter(o => o.name !== option.name);
            // If array becomes empty, remove the key entirely (optional, but cleaner)
            if (newSelection[groupId].length === 0) {
              delete newSelection[groupId];
            }
          }
        } else if (group.selectionType === 'SINGLE' || (group as any).type === 'single-select') {
          // For RadioGroup, 'checked' is the value (option.name) of the selected item
          if (typeof checked === 'string' && checked === option.name) {
             // Set the selected option directly
             newSelection[groupId] = option;
          }
          // No 'else' needed as RadioGroup handles deselection implicitly by selecting another
        }
        return newSelection;
      });
    } catch (err) {
      console.error("Error updating modifiers:", err);
    }
  };

   // Set default selections for required single-select groups
   useEffect(() => {
    try {
      const defaultSelections: Record<string, ModifierOption> = {};
      item.modifiers?.forEach(group => {
        if ((group.selectionType === 'SINGLE' || (group as any).type === 'single-select') && (group.isRequired || (group as any).required) && group.options.length > 0) {
          // Select the first option by default if none is selected for this required group
          const groupId = group._id || group.name;
          if (!selectedModifiers[groupId]) {
             defaultSelections[groupId] = group.options[0];
          }
        }
      });
      if (Object.keys(defaultSelections).length > 0) {
         setSelectedModifiers(prev => ({ ...prev, ...defaultSelections }));
      }
    } catch (err) {
      console.error("Error setting default selections:", err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.modifiers]); // Run only when item modifiers change

  // Reset state when drawer closes
  useEffect(() => {
    return () => {
      // This cleanup function runs when the component unmounts
      setSelectedModifiers({});
      setSpecialInstructions('');
      setQuantity(1);
      setImageLoaded(false);
      setSubmitError(null);
    };
  }, []);

  const handleAddToCart = () => {
    setIsLoading(true);
    setSubmitError(null);
    
    // Simulate a small delay for better UX
    setTimeout(() => {
      try {
        // Validate required modifiers if needed
        const missingRequiredGroups = item.modifiers?.filter(group => {
          const groupId = group._id || group.name;
          return (group.isRequired || (group as any).required) && (!selectedModifiers[groupId] || 
            (Array.isArray(selectedModifiers[groupId]) && 
              (selectedModifiers[groupId] as ModifierOption[]).length === 0));
        });
        
        if (missingRequiredGroups && missingRequiredGroups.length > 0) {
          setSubmitError(`Please select options for: ${missingRequiredGroups.map(g => g.name).join(', ')}`);
          setIsLoading(false);
          return;
        }
        
        // Flatten selected modifiers into the CartItemModifier[] format
        const cartModifiers: CartItemModifier[] = [];
        
        Object.entries(selectedModifiers).forEach(([groupId, selection]) => {
          // Find the corresponding modifier group to get additional info
          const modifierGroup = item.modifiers?.find(group => (group._id || group.name) === groupId);
          
          if (Array.isArray(selection)) {
            // Add all selections from multi-select groups
            selection.forEach(option => {
              if (option && option.name) {
                cartModifiers.push({
                  id: option.name,
                  name: option.name,
                  price: option.price || 0,
                  groupId: groupId,
                  optionId: (option as any)._id || option.name
                });
              }
            });
          } else if (selection && selection.name) {
            // Add single selection from single-select groups
            cartModifiers.push({
              id: selection.name,
              name: selection.name,
              price: selection.price || 0,
              groupId: groupId,
              optionId: (selection as any)._id || selection.name
            });
          }
        });

        addItem(
          item, // The base menu item
          quantity,
          cartModifiers.length > 0 ? cartModifiers : undefined,
          undefined, // Cooking preference removed, handle via modifiers if needed
          specialInstructions || undefined
        );
        
        // Show success toast
        toast.success(`${quantity} × ${item.name} added to cart`);
        
        // Close drawer after successful add (use onClose if provided)
        if (onClose) {
          setTimeout(() => {
            onClose();
          }, 300);
        }
        
      } catch (error) {
        console.error('Error adding item to cart:', error);
        setSubmitError('Failed to add item to cart. Please try again.');
        toast.error('Failed to add item to cart');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  if (!item || !item.name) {
    return (
      <div className="flex flex-col h-full p-4 items-center justify-center">
        <p>Item information not available</p>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#1F1D2B', color: 'white' }}>
      {/* Close button - outside ScrollArea for better positioning */}
      <Button 
        variant="outline" 
        size="icon" 
        className="absolute top-4 right-4 z-10 rounded-full bg-white bg-opacity-80 backdrop-blur-sm hover:bg-opacity-100 shadow-sm"
        aria-label="Close"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>
      
      {/* Use ScrollArea for content scrolling within the drawer */}
      <ScrollArea className="px-1 flex-1 overflow-y-auto">
        {/* Item Image with loading state */}
        <div className="relative mb-4 -mx-1">
          <div className={cn(
            "aspect-[4/3] overflow-hidden transition-opacity duration-300",
            !imageLoaded && "animate-pulse bg-muted"
          )}>
            <img
              src={item.image || `https://source.unsplash.com/random/600x400/?${item.imageSearchTerm || 'food'}`}
              alt={item.name}
              className={cn(
                "w-full h-full object-cover transition-transform duration-500",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)} // Also set loaded on error to remove skeleton
            />
          </div>
          
          {/* Featured badge */}
          {item.featured && (
            <div className="absolute top-4 left-4 bg-purple-600 text-white text-xs px-3 py-1 rounded-full">
              Featured
            </div>
          )}
        </div>
        
        {/* Item Name and Description */}
        <div className="mb-4 px-4">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-2xl font-semibold">{item.name}</h2>
            <span className="text-xl font-bold text-purple-600">${item.price.toFixed(2)}</span>
          </div>
          
          {/* Tags and metadata */}
          <div className="flex flex-wrap gap-2 mb-3">
            {(item as any).preparationTime && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {typeof (item as any).preparationTime === 'string' ? (item as any).preparationTime : `${(item as any).preparationTime} min`}
              </Badge>
            )}
            
            {(item as any).rating && (
              <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                {(item as any).rating}
              </Badge>
            )}
            
            {item.tags && item.tags.length > 0 && item.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
          
          <p className="text-muted-foreground text-sm">{item.description}</p>
        </div>
        
        {/* Divider */}
        <div className="border-t border-border mb-4 mx-4"></div>
        
        {/* Error message */}
        {submitError && (
          <div className="mb-4 mx-4 p-3 bg-red-100 border border-red-200 rounded-md text-red-800">
            <p className="text-sm">{submitError}</p>
          </div>
        )}
        
        {/* Modifier Groups */}
        {item.modifiers && item.modifiers.length > 0 && (
          <div className="mb-6 px-4 space-y-6">
            {item.modifiers.map((group) => (
              <div key={group._id || group.name} className="animation-fade-in"> 
                <h3 className="font-medium mb-3 flex items-center">
                  {group.name}
                  {(group.isRequired || (group as any).required) && <span className="text-destructive ml-1">*</span>}
                  {(group.selectionType === 'MULTIPLE' || (group as any).type === 'multi-select') && !(group.isRequired || (group as any).required) && (
                    <span className="text-muted-foreground text-xs ml-2 bg-muted px-2 py-0.5 rounded-full">
                      Select multiple
                    </span>
                  )}
                  {(group.selectionType === 'SINGLE' || (group as any).type === 'single-select') && !(group.isRequired || (group as any).required) && (
                    <span className="text-muted-foreground text-xs ml-2 bg-muted px-2 py-0.5 rounded-full">
                      Select one
                    </span>
                  )}
                </h3>
                
                {/* Render RadioGroup for single-select */}
                {(group.selectionType === 'SINGLE' || (group as any).type === 'single-select') ? (
                  <RadioGroup
                    value={(selectedModifiers[group._id || group.name] as ModifierOption)?.name} // Controlled component: value is the name of the selected option
                    onValueChange={(value) => {
                      // Find the option object corresponding to the selected value (name)
                      const selectedOption = group.options.find(opt => opt.name === value);
                      if (selectedOption) {
                        handleModifierChange(group, selectedOption, value);
                      }
                    }}
                    className="space-y-2"
                  >
                    {group.options.map(option => (
                      <div key={option.name} className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={option.name} id={`${group.name}-${option.name}`} />
                          <Label htmlFor={`${group.name}-${option.name}`} className="cursor-pointer">{option.name}</Label>
                        </div>
                        <span className="text-sm font-medium text-purple-600">
                          {option.price > 0 ? `+$${option.price.toFixed(2)}` : ((group as any).required ? '' : 'Included')}
                        </span>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                // Render Checkboxes for multi-select
                <div className="space-y-2">
                  {group.options.map(option => {
                    // Determine if this checkbox option is currently selected
                    const groupId = group._id || group.name;
                    const isChecked = Array.isArray(selectedModifiers[groupId])
                                      ? (selectedModifiers[groupId] as ModifierOption[]).some(o => o.name === option.name)
                                      : false;
                    return (
                      <div key={option.name} className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${groupId}-${option.name}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => handleModifierChange(group, option, checked === true)}
                          />
                          <Label htmlFor={`${groupId}-${option.name}`}>{option.name}</Label>
                        </div>
                        <span className="text-sm font-medium text-purple-600">
                          {option.price > 0 ? `+$${option.price.toFixed(2)}` : 'Included'}
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

      {/* Special Instructions */}
      <div className="mb-6 px-4">
        <h3 className="font-medium mb-2">Special Instructions</h3>
        <Textarea
          placeholder="Any allergies or special requests? (e.g., 'no onions')"
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          className="resize-none h-24 bg-muted/50 border-border"
        />
      </div>

      {/* Quantity Selector */}
      <div className="mb-6 px-4 flex items-center justify-between">
        <h3 className="font-medium">Quantity</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="font-medium w-8 text-center" aria-live="polite">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setQuantity(q => q + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </ScrollArea>

      {/* Footer with Price and Add to Cart Button - outside ScrollArea for sticky positioning */}
      <div className="sticky bottom-0 bg-background py-4 px-4 mt-auto border-t"> 
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg py-6"
          onClick={handleAddToCart}
          // Disable if a required single-select group doesn't have a selection or is loading
          disabled={
            isLoading || 
            item.modifiers?.some(g => {
              const groupId = (g as any)._id || g.name;
              return ((g as any).type === 'single-select' || g.selectionType === 'SINGLE') && 
                     ((g as any).required || g.isRequired) && 
                     !selectedModifiers[groupId];
            })
          }
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Adding to cart...
            </div>
          ) : (
            <>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add {quantity} to Cart - ${totalPrice.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
