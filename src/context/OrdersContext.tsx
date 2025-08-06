import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, OrdersContextType } from '@/types';
import { toast } from 'sonner';
import { fetchUserOrders, getOrderById as fetchOrderById } from '@/api/orderService';
import { useAuth } from './AuthContext';

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { isAuthenticated, token, user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Fetch orders when authenticated
  useEffect(() => {
    const loadOrders = async () => {
      console.log('🔄 OrdersContext useEffect triggered:', {
        isAuthenticated,
        hasToken: !!token,
        tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
        userEmail: user?.email
      });
      
      // For HTTP-only cookie authentication, we only need to check isAuthenticated
      // Token might not be available in localStorage/context with HTTP-only cookies
      if (!isAuthenticated) {
        console.log('❌ OrdersContext: Not authenticated, skipping order fetch');
        setOrders([]);
        return;
      }
      
      // Additional check for any form of authentication (token OR user presence)
      const hasAuthData = token || user || 
                         localStorage.getItem('auth_token') || 
                         localStorage.getItem('access_token') ||
                         document.cookie.includes('auth') ||
                         document.cookie.includes('session');
      
      if (!hasAuthData) {
        console.log('❌ OrdersContext: No authentication data found, skipping order fetch');
        setOrders([]);
        return;
      }
      
      try {
        setLoading(true);
        console.log('✅ OrdersContext: Loading orders for authenticated user...');
        
        const response = await fetchUserOrders();
        console.log('✅ OrdersContext: Orders response received:', response);
        
        // Check if response is an array (direct API response) or has an orders property
        const ordersData = Array.isArray(response) ? response : (response.orders || []);
        
        console.log('✅ OrdersContext: Processed orders data:', ordersData);
        console.log('✅ OrdersContext: Orders data length:', ordersData.length);
        
        // Also check for group orders where this user was a participant
        await addParticipantGroupOrders(ordersData);
        
        setOrders(ordersData);
        console.log('✅ OrdersContext: Orders set in context:', ordersData.length, 'orders');
      } catch (error: any) {
        console.error('Failed to fetch orders:', error);
        
        // Handle auth errors gracefully - don't show error toast for auth issues
        if (error.message?.includes('Authentication required')) {
          console.log('Authentication required for orders, setting empty array');
          setOrders([]);
        } else {
          console.error('Non-auth error fetching orders:', error);
          toast.error('Failed to load your orders');
          setOrders([]); // Set empty array instead of leaving undefined
        }
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
    
    // Store timestamp for recent order tracking (for rating verification)
    localStorage.setItem('last_order_time', Date.now().toString());
    
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
      
      // Get current orders before refresh to preserve group orders
      const currentOrders = orders;
      const groupOrders = currentOrders.filter(order => order.isGroupOrder);
      console.log('Preserving group orders during refresh:', groupOrders.length);
      
      const response = await fetchUserOrders();
      
      // Check if response is an array (direct API response) or has an orders property
      const fetchedOrders = Array.isArray(response) ? response : (response.orders || []);
      console.log('Fetched orders for refresh:', fetchedOrders.length);
      
      // Merge fetched orders with preserved group orders
      // Remove any duplicates by checking order IDs
      const mergedOrders = [...fetchedOrders];
      
      groupOrders.forEach(groupOrder => {
        const exists = fetchedOrders.find(order => 
          order.id === groupOrder.id || 
          order._id === groupOrder._id || 
          order.groupOrderId === groupOrder.groupOrderId
        );
        
        if (!exists) {
          console.log('Preserving group order not found in API:', groupOrder.id || groupOrder._id);
          mergedOrders.push(groupOrder);
        }
      });
      
      // Check for group orders where this user was a participant
      await addParticipantGroupOrders(mergedOrders);
      
      console.log('Final merged orders count:', mergedOrders.length);
      setOrders(mergedOrders);
      
      // Trigger event to notify components that orders have been refreshed
      window.dispatchEvent(new CustomEvent('orders-refreshed', { 
        detail: { orders: mergedOrders } 
      }));
      
      return mergedOrders;
    } catch (error) {
      console.error('Failed to refresh orders:', error);
      // Don't show toast for background refresh failures
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Function to add group orders where the current user was a participant
  const addParticipantGroupOrders = async (currentOrders: Order[]) => {
    try {
      const currentUserId = user?.id || user?._id || localStorage.getItem('user_id') || localStorage.getItem('currentUserId');
      if (!currentUserId) {
        console.log('No current user ID found, skipping participant group orders');
        return;
      }
      
      // Look for stored group order data in localStorage
      const localStorageKeys = Object.keys(localStorage);
      const groupOrderKeys = localStorageKeys.filter(key => key.startsWith('groupOrder_'));
      
      console.log('Checking for participant group orders:', groupOrderKeys.length);
      
      for (const key of groupOrderKeys) {
        try {
          const groupOrderData = JSON.parse(localStorage.getItem(key) || '{}');
          const groupOrderId = groupOrderData.groupOrderId;
          
          // Check if this user was a participant and if we don't already have this order
          const isParticipant = groupOrderData.participants?.some((p: any) => 
            p.userId === currentUserId || p._id === currentUserId
          );
          
          const alreadyExists = currentOrders.some(order => 
            order.id === groupOrderId || 
            order._id === groupOrderId || 
            order.groupOrderId === groupOrderId
          );
          
          if (isParticipant && !alreadyExists && groupOrderData.groupOrderId) {
            console.log('Adding participant group order:', groupOrderId);
            
            // Calculate the payment amount for this specific user based on payment structure
            let userPaymentAmount = 0;
            const currentParticipant = groupOrderData.participants.find((p: any) => 
              p.userId === currentUserId || p._id === currentUserId
            );
            
            switch (groupOrderData.paymentStructure) {
              case 'pay_all':
                // For pay_all, any participant can pay the full amount
                userPaymentAmount = groupOrderData.totalAmount;
                break;
              case 'equal_split':
                // Split equally among all participants
                userPaymentAmount = groupOrderData.totalAmount / groupOrderData.participantCount;
                break;
              case 'pay_own':
                // User pays only for their own items
                userPaymentAmount = currentParticipant?.totalAmount || 0;
                break;
              case 'custom_split':
                // Custom split (to be implemented)
                userPaymentAmount = groupOrderData.totalAmount / groupOrderData.participantCount;
                break;
              default:
                userPaymentAmount = currentParticipant?.totalAmount || 0;
            }
            
            // Create the participant's version of the group order
            const participantOrder: Order = {
              id: groupOrderId,
              _id: groupOrderId,
              orderNumber: groupOrderData.orderNumber,
              items: groupOrderData.items.map((item: any) => ({
                id: item.id,
                menuItemId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                specialInstructions: item.specialInstructions || '',
                modifiers: item.modifiers || []
              })),
              subtotal: userPaymentAmount,
              tax: 0,
              serviceFee: 0,
              tip: 0,
              total: userPaymentAmount,
              status: groupOrderData.status || 'PENDING',
              paymentStatus: groupOrderData.paymentStatus || 'PENDING',
              timestamp: new Date(groupOrderData.placedAt),
              createdAt: groupOrderData.placedAt,
              tableId: groupOrderData.tableId || '',
              userId: currentUserId,
              specialInstructions: getPaymentStructureDescription(
                groupOrderData.paymentStructure, 
                userPaymentAmount, 
                groupOrderData.participantCount
              ),
              isGroupOrder: true,
              groupOrderId: groupOrderId,
              groupOrderData: {
                joinCode: groupOrderData.joinCode,
                participants: groupOrderData.participants,
                paymentStructure: groupOrderData.paymentStructure,
                totalParticipants: groupOrderData.participantCount,
                participantUserIds: groupOrderData.participants.map((p: any) => p.userId).filter(Boolean)
              }
            };
            
            currentOrders.push(participantOrder);
          }
        } catch (error) {
          console.error('Error processing group order key:', key, error);
        }
      }
    } catch (error) {
      console.error('Error adding participant group orders:', error);
    }
  };

  // Helper function to get payment structure description
  const getPaymentStructureDescription = (
    paymentStructure: string, 
    amount: number, 
    participantCount: number
  ): string => {
    switch (paymentStructure) {
      case 'pay_all':
        return `Group Order - Can pay for all ${participantCount} participants ($${amount.toFixed(2)})`;
      case 'equal_split':
        return `Group Order - Your share (split equally among ${participantCount} participants)`;
      case 'pay_own':
        return `Group Order - Your items only ($${amount.toFixed(2)})`;
      case 'custom_split':
        return `Group Order - Custom split amount ($${amount.toFixed(2)})`;
      default:
        return `Group Order - Your portion ($${amount.toFixed(2)})`;
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
