import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTableInfo } from './TableContext';
import { toast } from 'sonner';

export interface CartModifier {
  id: string;
  name: string;
  price: number;
  groupId?: string;
  optionId?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  tableId?: string; // Associate item with a specific table
  specialInstructions?: string;
  modifiers?: CartModifier[]; 
  dateAdded: number; // Timestamp for sorting
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity' | 'dateAdded'>) => void;
  addItem: (
    item: any,
    quantity: number,
    modifiers?: CartModifier[],
    options?: any,
    specialInstructions?: string
  ) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  addTip: (amount: number) => void;
  itemCount: number;
  cartTotal: number;
  tipAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get table ID from context
  const { tableId } = useTableInfo();
  
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('cart');
    const parsedCart = savedCart ? JSON.parse(savedCart) : [];
    
    // If we have a table ID, filter items to show only those for this table
    if (tableId) {
      return parsedCart.filter((item: CartItem) => 
        !item.tableId || item.tableId === tableId
      );
    }
    
    return parsedCart;
  });
  
  const [itemCount, setItemCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);

  // Listen for cart clear events from logout
  useEffect(() => {
    const handleCartClear = () => {
      console.log('Cart cleared due to logout');
      localStorage.removeItem('cart');
      localStorage.removeItem('pendingCart'); // Also clear pending cart
      setCartItems([]);
    };
    
    window.addEventListener('cart-cleared', handleCartClear);
    
    return () => {
      window.removeEventListener('cart-cleared', handleCartClear);
    };
  }, []);

  // When tableId changes, filter cart items to only show items for this table
  useEffect(() => {
    if (tableId) {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const allItems = JSON.parse(savedCart);
        const tableItems = allItems.filter((item: CartItem) => 
          !item.tableId || item.tableId === tableId
        );
        setCartItems(tableItems);
      }
    }
  }, [tableId]);

  useEffect(() => {
    // Get all existing cart items first
    const savedCart = localStorage.getItem('cart');
    const allItems = savedCart ? JSON.parse(savedCart) : [];
    
    // Replace or merge items for the current table
    let updatedCart: CartItem[];
    if (tableId) {
      // Remove items for this table from the full cart
      const otherTableItems = allItems.filter((item: CartItem) => 
        item.tableId && item.tableId !== tableId
      );
      
      // Add the current table's items
      updatedCart = [...otherTableItems, ...cartItems];
    } else {
      updatedCart = cartItems;
    }
    
    // Save all cart items back to localStorage
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    
    // Update cart count and total
    const count = cartItems.reduce((total, item) => total + item.quantity, 0);
    setItemCount(count);
    
    const total = cartItems.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const modifiersTotal = item.modifiers 
        ? item.modifiers.reduce((mSum, modifier) => mSum + modifier.price, 0) * item.quantity
        : 0;
      return sum + itemTotal + modifiersTotal;
    }, 0);
    setCartTotal(total);
  }, [cartItems, tableId]);

  const addToCart = (item: Omit<CartItem, 'quantity' | 'dateAdded'>) => {
    try {
      setCartItems(prevItems => {
        // Generate a unique ID if item has modifiers to avoid conflicts
        const itemId = item.modifiers && item.modifiers.length > 0 
          ? `${item.id}-${Date.now()}` 
          : item.id;
        
        // Check if item already exists in cart
        const existingItemIndex = prevItems.findIndex(cartItem => cartItem.id === itemId);
        
        if (existingItemIndex >= 0) {
          // If item exists, increase quantity
          const updatedItems = [...prevItems];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + 1
          };
          return updatedItems;
        } else {
          // If item doesn't exist, add new item with quantity 1
          const newItem = { 
            ...item, 
            id: itemId,
            quantity: 1, 
            tableId: tableId || undefined,
            dateAdded: Date.now()
          };
          return [...prevItems, newItem];
        }
      });
      
      toast.success(`Added ${item.name} to cart`);
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };
  
  // New comprehensive addItem function for use with ItemDetailDrawer
  const addItem = (
    item: any,
    quantity: number = 1,
    modifiers?: CartModifier[],
    options?: any,
    specialInstructions?: string
  ) => {
    try {
      // Generate unique ID for this specific item configuration
      const uniqueId = modifiers && modifiers.length > 0
        ? `${item.id || item._id}-${Date.now()}`
        : item.id || item._id;
      
      const newItem: CartItem = {
        id: uniqueId,
        name: item.name,
        price: item.price,
        image: item.image,
        description: item.description,
        quantity: quantity,
        modifiers: modifiers,
        specialInstructions: specialInstructions,
        tableId: tableId || undefined,
        dateAdded: Date.now()
      };
      
      setCartItems(prev => [...prev, newItem]);
      toast.success(`Added ${quantity} × ${item.name} to cart`);
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    // If we have a tableId, only clear items for this table
    if (tableId) {
      // Get all cart items
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const allItems = JSON.parse(savedCart);
        // Keep items for other tables
        const otherTableItems = allItems.filter((item: CartItem) => 
          item.tableId && item.tableId !== tableId
        );
        localStorage.setItem('cart', JSON.stringify(otherTableItems));
      }
      
      // Clear local state
      setCartItems([]);
    } else {
      // Clear everything if no table ID
      localStorage.removeItem('cart');
      setCartItems([]);
    }
  };

  const addTip = (amount: number) => {
    setTipAmount(amount);
  };

  const value = {
    cartItems,
    addToCart,
    addItem,
    removeFromCart,
    updateQuantity,
    clearCart,
    addTip,
    itemCount,
    cartTotal,
    tipAmount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext;
