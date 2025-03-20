
import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartContextType, CartItem, MenuItem, CartItemModifier } from '@/types';
import { toast } from 'sonner';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (
    menuItem: MenuItem, 
    quantity: number, 
    modifiers?: CartItemModifier[], 
    cookingPreference?: string,
    specialInstructions?: string
  ) => {
    setItems(prevItems => {
      // Calculate total price including modifiers
      let totalPrice = menuItem.price;
      if (modifiers && modifiers.length > 0) {
        totalPrice += modifiers.reduce((sum, mod) => sum + mod.price, 0);
      }

      // Create a unique key for the item based on its selections
      const modifierKey = modifiers?.map(m => m.id).sort().join('-') || '';
      const preferenceKey = cookingPreference || '';
      const instructionsKey = specialInstructions || '';
      const uniqueKey = `${menuItem.id}-${modifierKey}-${preferenceKey}-${instructionsKey}`;
      
      // Check if this exact item (with same modifiers and preferences) exists
      const existingItemIndex = prevItems.findIndex(item => 
        `${item.menuItemId}-${item.modifiers?.map(m => m.id).sort().join('-') || ''}-${item.cookingPreference || ''}-${item.specialInstructions || ''}` === uniqueKey
      );
      
      if (existingItemIndex > -1) {
        // Update existing item quantity
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity
        };
        
        toast.success(`Updated ${menuItem.name} quantity in cart`);
        return updatedItems;
      } else {
        // Add new item
        toast.success(`Added ${menuItem.name} to cart`);
        return [...prevItems, {
          id: `${uniqueKey}-${Date.now()}`,
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: totalPrice,
          quantity,
          image: menuItem.image,
          modifiers,
          cookingPreference,
          specialInstructions
        }];
      }
    });
  };

  const removeItem = (id: string) => {
    setItems(prevItems => {
      const item = prevItems.find(item => item.id === id);
      if (item) {
        toast.info(`Removed ${item.name} from cart`);
      }
      return prevItems.filter(item => item.id !== id);
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    toast.info('Cart cleared');
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
