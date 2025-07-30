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
    console.log('Adding order to context:', order);
    setOrders(prev => {
      // Check if order already exists to prevent duplicates
      const existingOrder = prev.find(o => o.id === order.id || o._id === order.id);
      if (existingOrder) {
        console.log('Order already exists in context, not adding duplicate');
        return prev;
      }
      
      const newOrders = [order, ...prev];
      console.log('Updated orders in context:', newOrders.length);
      return newOrders;
    });
    
    toast.success('Order placed successfully!');
    
    // Trigger a custom event to notify other components about the new order
    window.dispatchEvent(new CustomEvent('order-placed', { 
      detail: { order } 
    }));
    
    // Also trigger a more specific event for immediate UI updates
    window.dispatchEvent(new CustomEvent('orders-updated', { 
      detail: { orders: orders, newOrder: order } 
    }));
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

  const refreshOrders = async () => {
    if (!isAuthenticated || !token) return;
    
    try {
      setLoading(true);
      console.log('Refreshing orders from context...');
      const response = await fetchUserOrders();
      
      // Check if response is an array (direct API response) or has an orders property
      const ordersData = Array.isArray(response) ? response : (response.orders || []);
      console.log('Fetched orders for refresh:', ordersData.length);
      
      setOrders(ordersData);
      
      // Trigger event to notify components that orders have been refreshed
      window.dispatchEvent(new CustomEvent('orders-refreshed', { 
        detail: { orders: ordersData } 
      }));
      
      return ordersData;
    } catch (error) {
      console.error('Failed to refresh orders:', error);
      // Don't show toast for background refresh failures
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        loading,
        addOrder,
        getOrderById,
        clearOrders,
        refreshOrders
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
