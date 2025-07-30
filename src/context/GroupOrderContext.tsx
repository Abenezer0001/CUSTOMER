import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { groupOrderingService, GroupOrder } from '@/services/GroupOrderingService';
import { CartItem } from './CartContext';
import { useTableInfo } from './TableContext';
import { toast } from 'sonner';

interface GroupOrderContextType {
  // Group order state
  isInGroupOrder: boolean;
  groupOrder: GroupOrder | null;
  currentParticipantId: string | null;
  
  // Group cart actions
  addItemToGroupCart: (item: CartItem) => Promise<void>;
  removeItemFromGroupCart: (itemId: string) => Promise<void>;
  updateGroupItemQuantity: (itemId: string, quantity: number) => Promise<void>;
  
  // Group order management
  createGroupOrder: (restaurantId: string, tableId: string) => Promise<boolean>;
  joinGroupOrder: (joinCode: string, userName: string, email: string) => Promise<boolean>;
  leaveGroupOrder: () => Promise<void>;
  refreshGroupOrder: () => Promise<void>;
  
  // Getters
  getGroupCartItems: () => CartItem[];
  getParticipantCartItems: (participantId: string) => CartItem[];
  getTotalGroupAmount: () => number;
}

const GroupOrderContext = createContext<GroupOrderContextType | undefined>(undefined);

export const useGroupOrder = (): GroupOrderContextType => {
  const context = useContext(GroupOrderContext);
  if (!context) {
    throw new Error('useGroupOrder must be used within a GroupOrderProvider');
  }
  return context;
};

interface GroupOrderProviderProps {
  children: React.ReactNode;
}

export const GroupOrderProvider: React.FC<GroupOrderProviderProps> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const { setTableInfo } = useTableInfo();
  const [isInGroupOrder, setIsInGroupOrder] = useState(false);
  const [groupOrder, setGroupOrder] = useState<GroupOrder | null>(null);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);

  // Check if we're in a group order context from URL parameters or sessionStorage
  useEffect(() => {
    const groupOrderId = searchParams.get('groupOrder');
    const joinCode = searchParams.get('joinCode');
    
    // Check sessionStorage for persisted group order
    const persistedGroupOrder = sessionStorage.getItem('currentGroupOrder');
    const persistedParticipantId = sessionStorage.getItem('currentParticipantId');
    
    if (groupOrderId || joinCode) {
      setIsInGroupOrder(true);
      if (groupOrderId) {
        loadGroupOrder(groupOrderId);
      } else if (joinCode) {
        // Will be handled by join flow
        setIsInGroupOrder(true);
      }
    } else if (persistedGroupOrder && persistedParticipantId) {
      // Restore from sessionStorage
      try {
        const parsedGroupOrder = JSON.parse(persistedGroupOrder);
        setGroupOrder(parsedGroupOrder);
        setCurrentParticipantId(persistedParticipantId);
        setIsInGroupOrder(true);
        
        // Refresh the group order data
        if (parsedGroupOrder._id) {
          loadGroupOrder(parsedGroupOrder._id);
        }
      } catch (error) {
        console.error('Error parsing persisted group order:', error);
        // Clear invalid data
        sessionStorage.removeItem('currentGroupOrder');
        sessionStorage.removeItem('currentParticipantId');
      }
    } else {
      setIsInGroupOrder(false);
      setGroupOrder(null);
      setCurrentParticipantId(null);
    }
  }, [searchParams]);

  // Persist group order to sessionStorage when it changes
  useEffect(() => {
    if (groupOrder && currentParticipantId) {
      sessionStorage.setItem('currentGroupOrder', JSON.stringify(groupOrder));
      sessionStorage.setItem('currentParticipantId', currentParticipantId);
    } else if (!isInGroupOrder) {
      // Clear when leaving group order
      sessionStorage.removeItem('currentGroupOrder');
      sessionStorage.removeItem('currentParticipantId');
    }
  }, [groupOrder, currentParticipantId, isInGroupOrder]);

  // Auto-refresh group order for real-time sync
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isInGroupOrder && groupOrder) {
      // Refresh every 5 seconds when in a group order
      interval = setInterval(() => {
        console.log('Auto-refreshing group order for sync...');
        refreshGroupOrder();
      }, 5000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isInGroupOrder, groupOrder]);

  const loadGroupOrder = async (groupOrderId: string) => {
    try {
      const order = await groupOrderingService.getGroupOrder(groupOrderId);
      setGroupOrder(order);
      
      // Automatically set table information from the loaded group order
      if (order.tableId) {
        console.log('🔄 Auto-setting table ID from loaded group order:', order.tableId);
        setTableInfo({
          tableId: order.tableId,
          tableNumber: order.tableId,
          restaurantName: 'InSeat',
          restaurantId: order.restaurantId
        });
      }
    } catch (error) {
      console.error('Failed to load group order:', error);
      toast.error('Failed to load group order');
      setIsInGroupOrder(false);
    }
  };

  const addItemToGroupCart = async (item: CartItem): Promise<void> => {
    if (!groupOrder || !currentParticipantId) {
      throw new Error('Not in a group order');
    }

    try {
      // Transform CartItem to the format expected by backend
      const orderItems = [{
        menuItemId: item.id,
        name: item.name, // Backend expects 'name' field
        quantity: item.quantity,
        price: item.price,
        customizations: item.modifiers?.map(m => m.name) || [],
        specialRequests: item.specialInstructions || ''
      }];

      await groupOrderingService.addItemsToGroup(groupOrder._id, orderItems);
      await refreshGroupOrder();
      toast.success('Item added to group cart');
    } catch (error) {
      console.error('Failed to add item to group cart:', error);
      toast.error('Failed to add item to group cart');
      throw error;
    }
  };

  const removeItemFromGroupCart = async (itemId: string): Promise<void> => {
    if (!groupOrder) {
      throw new Error('Not in a group order');
    }

    try {
      await groupOrderingService.removeItemsFromGroup(groupOrder._id, [itemId]);
      await refreshGroupOrder();
      toast.success('Item removed from group cart');
    } catch (error) {
      console.error('Failed to remove item from group cart:', error);
      toast.error('Failed to remove item from group cart');
      throw error;
    }
  };

  const updateGroupItemQuantity = async (itemId: string, quantity: number): Promise<void> => {
    if (!groupOrder) {
      throw new Error('Not in a group order');
    }

    try {
      if (quantity === 0) {
        await removeItemFromGroupCart(itemId);
      } else {
        // For now, we'll implement this by removing and re-adding
        // In a real implementation, you'd want a dedicated update endpoint
        await removeItemFromGroupCart(itemId);
        // Note: This is simplified - you'd need the full item details to re-add
      }
    } catch (error) {
      console.error('Failed to update item quantity:', error);
      toast.error('Failed to update item quantity');
      throw error;
    }
  };

  const createGroupOrder = async (restaurantId: string, tableId: string): Promise<boolean> => {
    try {
      const result = await groupOrderingService.createGroupOrder({
        restaurantId,
        tableId,
        expirationMinutes: 60 // 1 hour expiration
      });

      setGroupOrder(result.groupOrder);
      setCurrentParticipantId(result.participantId);
      setIsInGroupOrder(true);
      
      // Refresh to get complete group order data with participants
      try {
        const updatedOrder = await groupOrderingService.getGroupOrder(result.groupOrder._id);
        setGroupOrder(updatedOrder);
      } catch (refreshError) {
        console.error('Failed to refresh group order after creation:', refreshError);
      }
      
      console.log('✅ Group order created successfully:', result.groupOrder);
      toast.success(`Group order created! Share code: ${result.groupOrder.joinCode}`);
      
      return true;
    } catch (error) {
      console.error('Failed to create group order:', error);
      toast.error('Failed to create group order');
      return false;
    }
  };

  const joinGroupOrder = async (joinCode: string, userName: string, email: string): Promise<boolean> => {
    try {
      const result = await groupOrderingService.joinGroupOrder({
        joinCode,
        userName,
        email
      });

      setGroupOrder(result.groupOrder);
      setCurrentParticipantId(result.participantId);
      setIsInGroupOrder(true);
      
      // Automatically set table information from the group order
      if (result.groupOrder.tableId) {
        console.log('🔄 Auto-setting table ID from group order:', result.groupOrder.tableId);
        setTableInfo({
          tableId: result.groupOrder.tableId,
          tableNumber: result.groupOrder.tableId,
          restaurantName: 'InSeat',
          restaurantId: result.groupOrder.restaurantId
        });
      }
      
      // Refresh to get the latest group order data
      try {
        const updatedOrder = await groupOrderingService.getGroupOrder(result.groupOrder._id);
        setGroupOrder(updatedOrder);
      } catch (refreshError) {
        console.error('Failed to refresh group order after joining:', refreshError);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to join group order:', error);
      toast.error('Failed to join group order');
      return false;
    }
  };

  const leaveGroupOrder = async (): Promise<void> => {
    if (!groupOrder || !currentParticipantId) {
      return;
    }

    try {
      await groupOrderingService.leaveGroupOrder(groupOrder._id);
      setGroupOrder(null);
      setCurrentParticipantId(null);
      setIsInGroupOrder(false);
      toast.success('Left group order');
    } catch (error) {
      console.error('Failed to leave group order:', error);
      toast.error('Failed to leave group order');
      throw error;
    }
  };

  const refreshGroupOrder = async (): Promise<void> => {
    if (!groupOrder) return;

    try {
      const updatedOrder = await groupOrderingService.getGroupOrder(groupOrder._id);
      setGroupOrder(updatedOrder);
    } catch (error) {
      console.error('Failed to refresh group order:', error);
    }
  };

  const getGroupCartItems = (): CartItem[] => {
    if (!groupOrder) return [];

    // Try to get items from finalOrder first (group level items)
    const allItems: CartItem[] = [];
    
    // If we have finalOrder items, use those
    if (groupOrder.finalOrder && groupOrder.finalOrder.length > 0) {
      groupOrder.finalOrder.forEach(item => {
        allItems.push({
          id: item.itemId || `group-${item.menuItemId}`,
          name: item.name || item.menuItemName || 'Unknown Item', // Try both name and menuItemName
          price: item.price || 0,
          quantity: item.quantity || 1,
          specialInstructions: item.specialRequests,
          modifiers: item.customizations?.map(custom => ({
            id: custom,
            name: custom,
            price: 0
          })),
          dateAdded: Date.now()
        });
      });
    } else {
      // Fallback to participant items
      groupOrder.participants?.forEach(participant => {
        participant.items?.forEach(item => {
          allItems.push({
            id: item.itemId || `${participant._id}-${item.menuItemId}`,
            name: item.menuItemName || 'Unknown Item',
            price: item.price || 0,
            quantity: item.quantity || 1,
            specialInstructions: item.specialRequests,
            modifiers: item.customizations?.map(custom => ({
              id: custom,
              name: custom,
              price: 0
            })),
            dateAdded: Date.now()
          });
        });
      });
    }

    return allItems;
  };

  const getParticipantCartItems = (participantId: string): CartItem[] => {
    if (!groupOrder) return [];

    const participant = groupOrder.participants?.find(p => p._id === participantId);
    if (!participant) return [];

    return participant.items?.map(item => ({
      id: item.itemId || `${participantId}-${item.menuItemId}`,
      name: item.menuItemName || 'Unknown Item',
      price: item.price || 0,
      quantity: item.quantity || 1,
      specialInstructions: item.specialRequests,
      modifiers: item.customizations?.map(custom => ({
        id: custom,
        name: custom,
        price: 0
      })),
      dateAdded: Date.now()
    })) || [];
  };

  const getTotalGroupAmount = (): number => {
    if (!groupOrder) return 0;

    return groupOrder.participants?.reduce((total, participant) => {
      return total + (participant.totalAmount || 0);
    }, 0) || 0;
  };

  return (
    <GroupOrderContext.Provider
      value={{
        isInGroupOrder,
        groupOrder,
        currentParticipantId,
        addItemToGroupCart,
        removeItemFromGroupCart,
        updateGroupItemQuantity,
        createGroupOrder,
        joinGroupOrder,
        leaveGroupOrder,
        refreshGroupOrder,
        getGroupCartItems,
        getParticipantCartItems,
        getTotalGroupAmount
      }}
    >
      {children}
    </GroupOrderContext.Provider>
  );
};

export default GroupOrderProvider;