
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, OrdersContextType } from '@/types';
import { toast } from 'sonner';

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>(() => {
    const savedOrders = localStorage.getItem('orders');
    return savedOrders ? JSON.parse(savedOrders) : [];
  });

  useEffect(() => {
    localStorage.setItem('orders', JSON.stringify(orders));
  }, [orders]);

  const addOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);
    toast.success('Order placed successfully!');
  };

  const getOrderById = (id: string) => {
    return orders.find(order => order.id === id);
  };

  const clearOrders = () => {
    setOrders([]);
    toast.info('Order history cleared');
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
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
