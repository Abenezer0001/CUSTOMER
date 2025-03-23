
import React, { useState } from 'react';
import { MenuItem, CartItemModifier } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { DialogClose } from '@/components/ui/dialog';
import { useCart } from '@/context/CartContext';
import { ShoppingCart } from 'lucide-react';

interface ItemDetailDialogProps {
  item: MenuItem;
}

export const ItemDetailDialog: React.FC<ItemDetailDialogProps> = ({ item }) => {
  const { addItem } = useCart();
  const [selectedModifiers, setSelectedModifiers] = useState<CartItemModifier[]>([]);
  const [cookingPreference, setCookingPreference] = useState('Rare');
  const [totalPrice, setTotalPrice] = useState(item.price);
  
  // Simulated modifiers for the burger
  const burgerToppings = item.name.toLowerCase().includes('burger') ? [
    { id: 'extra-cheese', name: 'Extra Cheese', price: 1.50 },
    { id: 'bacon', name: 'Bacon', price: 2.00 },
    { id: 'caramelized-onions', name: 'Caramelized Onions', price: 1.00 }
  ] : [];
  
  // Simulated modifiers for pasta
  const pastaModifiers = item.name.toLowerCase().includes('pasta') ? [
    { id: 'extra-cheese', name: 'Extra Cheese', price: 1.50 },
    { id: 'extra-sauce', name: 'Extra Sauce', price: 1.00 },
    { id: 'gluten-free', name: 'Gluten-Free Pasta', price: 2.50 }
  ] : [];
  
  // Simulated modifiers for pizza
  const pizzaToppings = item.name.toLowerCase().includes('pizza') ? [
    { id: 'extra-cheese', name: 'Extra Cheese', price: 2.00 },
    { id: 'pepperoni', name: 'Pepperoni', price: 2.50 },
    { id: 'mushrooms', name: 'Mushrooms', price: 1.50 },
    { id: 'onions', name: 'Onions', price: 1.00 }
  ] : [];
  
  // Combined modifiers
  const availableModifiers = [...burgerToppings, ...pastaModifiers, ...pizzaToppings];
  
  // Simulated cooking preferences for the burger
  const cookingPreferences = item.name.toLowerCase().includes('burger') ? [
    { id: 'rare', name: 'Rare' },
    { id: 'medium-rare', name: 'Medium Rare' },
    { id: 'medium', name: 'Medium' },
    { id: 'medium-well', name: 'Medium Well' },
    { id: 'well-done', name: 'Well Done' }
  ] : [];

  const handleModifierChange = (modifier: CartItemModifier, checked: boolean) => {
    if (checked) {
      const newModifiers = [...selectedModifiers, modifier];
      setSelectedModifiers(newModifiers);
      setTotalPrice(item.price + newModifiers.reduce((sum, mod) => sum + mod.price, 0));
    } else {
      const newModifiers = selectedModifiers.filter(mod => mod.id !== modifier.id);
      setSelectedModifiers(newModifiers);
      setTotalPrice(item.price + newModifiers.reduce((sum, mod) => sum + mod.price, 0));
    }
  };

  const handleAddToCart = () => {
    addItem(
      item, 
      1, 
      selectedModifiers.length > 0 ? selectedModifiers : undefined,
      cookingPreferences.length > 0 ? cookingPreference : undefined
    );
  };

  return (
    <div className="py-2">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-medium">{item.name}</h2>
      </div>
      
      <p className="text-gray-600 mb-6">{item.description}</p>
      
      {availableModifiers.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium mb-3">Add Modifiers</h3>
          <div className="space-y-3">
            {availableModifiers.map(modifier => (
              <div key={modifier.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id={modifier.id} 
                    onCheckedChange={(checked) => 
                      handleModifierChange(modifier, checked === true)
                    }
                  />
                  <Label htmlFor={modifier.id}>{modifier.name}</Label>
                </div>
                <span className="text-emerald-600">+${modifier.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {cookingPreferences.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium mb-3">
            Cooking Preference <span className="text-red-500">*</span>
          </h3>
          <RadioGroup defaultValue="Rare" onValueChange={setCookingPreference}>
            <div className="grid grid-cols-2 gap-2">
              {cookingPreferences.map(pref => (
                <div key={pref.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                  <RadioGroupItem value={pref.name} id={pref.id} />
                  <Label htmlFor={pref.id}>{pref.name}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
      )}
      
      <div className="mt-6 pt-4 border-t flex justify-between items-center">
        <div className="font-medium">Total:</div>
        <div className="font-medium">${totalPrice.toFixed(2)}</div>
      </div>
      
      <DialogClose asChild>
        <Button 
          className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart - ${totalPrice.toFixed(2)}
        </Button>
      </DialogClose>
    </div>
  );
};
