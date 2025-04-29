import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, CartItemModifier, MenuItemModifierGroup, ModifierOption } from '@/types';
import { SharedImage } from './shared/SharedImage';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { DrawerHeader, DrawerFooter, DrawerClose } from './ui/drawer';
import { Clock, X, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { useCart } from '@/context/CartContext';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';

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

  // Calculate total price using useMemo for efficiency
  const totalPrice = useMemo(() => {
    let calculatedPrice = item.price;
    Object.values(selectedModifiers).forEach(modOrMods => {
      if (Array.isArray(modOrMods)) {
        // Sum prices of selected options in a multi-select group
        calculatedPrice += modOrMods.reduce((sum, mod) => sum + mod.price, 0);
      } else if (modOrMods) {
        // Add price of the selected option in a single-select group
        calculatedPrice += modOrMods.price;
      }
    });
    return calculatedPrice * quantity;
  }, [selectedModifiers, quantity, item.price]);

  // Handle modifier selection based on group type
  const handleModifierChange = (
    group: MenuItemModifierGroup,
    option: ModifierOption, // Now receiving the specific option
    checked: boolean | string // Checkbox sends boolean, RadioGroup sends value string (option.name)
  ) => {
    setSelectedModifiers(prev => {
      const newSelection = { ...prev };
      const groupName = group.name; // Use group name as key
      const currentGroupSelection = newSelection[groupName];

      if (group.type === 'multi-select') {
        const currentArray = Array.isArray(currentGroupSelection) ? currentGroupSelection : [];
        if (checked === true) {
          // Add option if checked
          newSelection[groupName] = [...currentArray, option];
        } else {
          // Remove option if unchecked
          newSelection[groupName] = currentArray.filter(o => o.name !== option.name);
          // If array becomes empty, remove the key entirely (optional, but cleaner)
          if (newSelection[groupName].length === 0) {
            delete newSelection[groupName];
          }
        }
      } else if (group.type === 'single-select') {
        // For RadioGroup, 'checked' is the value (option.name) of the selected item
        if (typeof checked === 'string' && checked === option.name) {
           // Set the selected option directly
           newSelection[groupName] = option;
        }
        // No 'else' needed as RadioGroup handles deselection implicitly by selecting another
      }
      return newSelection;
    });
  };

   // Set default selections for required single-select groups
   useEffect(() => {
    const defaultSelections: Record<string, ModifierOption> = {};
    item.modifiers?.forEach(group => {
      if (group.type === 'single-select' && group.required && group.options.length > 0) {
        // Select the first option by default if none is selected for this required group
        if (!selectedModifiers[group.name]) {
           defaultSelections[group.name] = group.options[0];
        }
      }
    });
    if (Object.keys(defaultSelections).length > 0) {
       setSelectedModifiers(prev => ({ ...prev, ...defaultSelections }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.modifiers]); // Run only when item modifiers change


  const handleAddToCart = () => {
    // Flatten selected modifiers into the CartItemModifier[] format
    // Assuming ModifierOption has the same shape as CartItemModifier ({ name, price })
    const cartModifiers: CartItemModifier[] = Object.values(selectedModifiers)
                                                  .flat() // Flattens arrays from multi-select
                                                  .filter(Boolean) // Removes undefined/null entries
                                                  .map(mod => ({ id: mod.name, name: mod.name, price: mod.price })); // Map to CartItemModifier structure if needed

    addItem(
      item, // The base menu item
      quantity,
      cartModifiers.length > 0 ? cartModifiers : undefined,
      undefined, // Cooking preference removed, handle via modifiers if needed
      specialInstructions || undefined
    );
    // Drawer will close automatically due to DrawerClose wrapper on button
  };

  return (
    // Use ScrollArea for content scrolling within the drawer
    // Removed h-full as drawer height is controlled externally by the Drawer component
    <ScrollArea className="px-1 max-h-[80vh]"> {/* Limit height for scroll */}
       {/* DrawerClose button is standard for shadcn Drawer */}
       <DrawerClose asChild className="absolute top-4 right-4 z-10">
         <Button variant="ghost" size="icon" aria-label="Close">
           <X className="h-5 w-5" />
         </Button>
       </DrawerClose>

      {/* Item Image */}
      <div className="mb-4 aspect-video relative -mx-1"> {/* Adjust margin for edge-to-edge */}
        <img
          src={item.image || `https://source.unsplash.com/random/400x300/?${item.imageSearchTerm || 'food'}`}
          alt={item.name}
          className="w-full h-full object-cover" // Removed rounded-lg to fit drawer edges
          loading="lazy"
        />
      </div>

      {/* Item Name and Description */}
      <div className="mb-4 px-2">
        <h2 className="text-2xl font-semibold mb-2">{item.name}</h2>
        <p className="text-muted-foreground">{item.description}</p>
      </div>

      {/* Modifier Groups */}
      {item.modifiers && item.modifiers.length > 0 && (
        <div className="mb-6 px-2 space-y-4">
          {item.modifiers.map((group) => (
            <div key={group.name}> {/* Use group.name as key */}
              <h3 className="font-medium mb-3">
                {group.name}
                {group.required && <span className="text-destructive ml-1">*</span>}
                {group.type === 'multi-select' && !group.required && <span className="text-muted-foreground text-sm ml-1">(Optional, select multiple)</span>}
                {group.type === 'single-select' && !group.required && <span className="text-muted-foreground text-sm ml-1">(Optional, select one)</span>}
              </h3>
              {/* Render RadioGroup for single-select */}
              {group.type === 'single-select' ? (
                <RadioGroup
                  value={ (selectedModifiers[group.name] as ModifierOption)?.name } // Controlled component: value is the name of the selected option
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
                         {/* Value must be unique string, using option.name */}
                        <RadioGroupItem value={option.name} id={`${group.name}-${option.name}`} />
                        <Label htmlFor={`${group.name}-${option.name}`}>{option.name}</Label>
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {option.price > 0 ? `+$${option.price.toFixed(2)}` : (group.required ? '' : 'Included')} {/* Show price diff or 'Included' */}
                      </span>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                // Render Checkboxes for multi-select
                <div className="space-y-2">
                  {group.options.map(option => {
                    // Determine if this checkbox option is currently selected
                    const isChecked = Array.isArray(selectedModifiers[group.name])
                                      ? (selectedModifiers[group.name] as ModifierOption[]).some(o => o.name === option.name)
                                      : false;
                    return (
                      <div key={option.name} className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${group.name}-${option.name}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => handleModifierChange(group, option, checked === true)}
                          />
                          <Label htmlFor={`${group.name}-${option.name}`}>{option.name}</Label>
                        </div>
                        <span className="text-sm font-medium text-primary">
                          {option.price > 0 ? `+$${option.price.toFixed(2)}` : 'Included'} {/* Show price diff or 'Included' */}
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
      <div className="mb-6 px-2">
        <h3 className="font-medium mb-2">Special Instructions</h3>
        <Textarea
          placeholder="Any allergies or special requests? (e.g., 'no onions')"
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          className="resize-none h-24 bg-muted/50 border-border"
        />
      </div>

      {/* Quantity Selector */}
      <div className="mb-6 px-2 flex items-center justify-between">
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

      {/* Footer with Price and Add to Cart Button */}
      {/* This div acts as a sticky footer within the scrollable area */}
      <div className="sticky bottom-0 bg-background py-4 px-2 mt-auto border-t -mx-1"> {/* Adjust margin */}
         <DrawerClose asChild> {/* Close drawer on add */}
           <Button
             className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6"
             onClick={handleAddToCart}
             // Disable if a required single-select group doesn't have a selection
             disabled={item.modifiers?.some(g => g.type === 'single-select' && g.required && !selectedModifiers[g.name])}
           >
             <ShoppingCart className="mr-2 h-5 w-5" />
             Add {quantity} to Cart - ${totalPrice.toFixed(2)} {/* Use calculated totalPrice */}
           </Button>
         </DrawerClose>
      </div>
    </ScrollArea>
  );
};
