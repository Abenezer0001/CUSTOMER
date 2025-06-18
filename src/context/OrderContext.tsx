import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CartItem } from './CartContext';
import { useAuth } from './AuthContext';
import { Order } from '../types/Order';

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  createdAt: string;
  tableNumber?: string;
  userId?: string;
  restaurantId: string;
  venueId: string;
  specialInstructions?: string;
}

interface OrderContextType {
  orders: Order[];
  currentOrder: Order | null;
  createOrder: (items: CartItem[], total: number, tableNumber?: string, specialInstructions?: string) => Promise<Order>;
  getOrderHistory: () => Promise<Order[]>;
  cancelOrder: (orderId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  setCurrentOrder: (order: Order | null) => void;
  orderHistory: Order[];
  addToOrderHistory: (order: Order) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const { user } = useAuth();

  // Listen for logout events to clear order data
  useEffect(() => {
    const handleAuthStateChange = (event: any) => {
      if (event.detail && !event.detail.isAuthenticated) {
        console.log('Orders cleared due to logout');
        setOrders([]);
        setCurrentOrder(null);
        setOrderHistory([]);
        setError(null);
      }
    };
    
    window.addEventListener('auth-state-changed', handleAuthStateChange);
    
    return () => {
      window.removeEventListener('auth-state-changed', handleAuthStateChange);
    };
  }, []);

  // Simulate restaurant and venue IDs (in a real app these would come from a configuration or current selection)
  const restaurantId = "restaurant-1";
  const venueId = "venue-1";

  const createOrder = async (
    items: CartItem[], 
    total: number, 
    tableNumber?: string,
    specialInstructions?: string
  ): Promise<Order> => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call
      const newOrder: Order = {
        id: `order-${Date.now()}`,
        items: [...items],
        total,
        status: 'pending',
        createdAt: new Date().toISOString(),
        tableNumber,
        userId: user?.id,
        restaurantId,
        venueId,
        specialInstructions
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to local storage for persistence
      const savedOrders = localStorage.getItem('orders');
      const parsedOrders = savedOrders ? JSON.parse(savedOrders) : [];
      const updatedOrders = [...parsedOrders, newOrder];
      localStorage.setItem('orders', JSON.stringify(updatedOrders));
      
      setOrders(updatedOrders);
      setCurrentOrder(newOrder);
      addToOrderHistory(newOrder);
      return newOrder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getOrderHistory = async (): Promise<Order[]> => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call filtered by user ID
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const savedOrders = localStorage.getItem('orders');
      const parsedOrders = savedOrders ? JSON.parse(savedOrders) : [];
      
      // Filter by current user if logged in
      const userOrders = user?.id
        ? parsedOrders.filter((order: Order) => order.userId === user.id)
        : parsedOrders;
      
      setOrders(userOrders);
      setOrderHistory(userOrders);
      return userOrders;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch order history';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const savedOrders = localStorage.getItem('orders');
      const parsedOrders = savedOrders ? JSON.parse(savedOrders) : [];
      
      const updatedOrders = parsedOrders.map((order: Order) => 
        order.id === orderId 
          ? { ...order, status: 'cancelled' } 
          : order
      );
      
      localStorage.setItem('orders', JSON.stringify(updatedOrders));
      
      setOrders(updatedOrders);
      
      // Update current order if it's the one being cancelled
      if (currentOrder?.id === orderId) {
        setCurrentOrder({ ...currentOrder, status: 'cancelled' });
      }
      
      setOrderHistory(prevHistory => prevHistory.filter(o => o.id !== orderId));
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addToOrderHistory = (order: Order) => {
    setOrderHistory(prevHistory => {
      // Prevent duplicates
      if (prevHistory.some(o => o.id === order.id)) {
        return prevHistory.map(o => o.id === order.id ? order : o);
      }
      return [...prevHistory, order];
    });
  };

  const value = {
    orders,
    currentOrder,
    createOrder,
    getOrderHistory,
    cancelOrder,
    loading,
    error,
    setCurrentOrder,
    orderHistory,
    addToOrderHistory
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export default OrderContext; 