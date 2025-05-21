import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, OrdersContextType } from '@/types';
import { toast } from 'sonner';
import { fetchUserOrders, getOrderById as fetchOrderById } from '@/api/orderService';
import { useAuth } from './AuthContext';

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { isAuthenticated, token } = useAuth();
  const [loading, setLoading] = useState(false);

  // Fetch orders when authenticated
  useEffect(() => {
    const loadOrders = async () => {
      if (!isAuthenticated || !token) return;
      
      try {
        setLoading(true);
        const response = await fetchUserOrders();
        // Check if response is an array (direct API response) or has an orders property
        const ordersData = Array.isArray(response) ? response : (response.orders || []);
        setOrders(ordersData);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        toast.error('Failed to load your orders');
      } finally {
        setLoading(false);
      }
    };
    
    loadOrders();
  }, [isAuthenticated, token]);

  const addOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);
    toast.success('Order placed successfully!');
  };

  const getOrderById = async (id: string) => {
    // First check local state
    const localOrder = orders.find(order => order._id === id);
    if (localOrder) return localOrder;
    
    // If not found locally and we're authenticated, try to fetch from API
    if (isAuthenticated && token) {
      try {
        const order = await fetchOrderById(id, token);
        return order;
      } catch (error) {
        console.error('Failed to fetch order details:', error);
        toast.error('Failed to load order details');
        return null;
      }
    }
    
    return null;
  };

  const clearOrders = () => {
    setOrders([]);
    toast.info('Order history cleared');
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        loading,
        addOrder,
        getOrderById,
        clearOrders
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};
