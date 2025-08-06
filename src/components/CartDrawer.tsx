import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '@/constants';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrdersContext';
import { useAuth } from '@/hooks/useAuth';
import authService from '@/api/authService';
import customerAuthService from '@/api/customerAuthService';
import apiClient from '@/api/apiClient';
import { useTableInfo } from '@/context/TableContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Trash2, Plus, Minus, X, ArrowRight, 
  Loader2, CreditCard, AlertCircle, Info, Link,
  DollarSign, Settings, User
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { createOrder, OrderResponseData } from '@/api/orderService'; 
import { createStripeCheckoutSession } from '@/api/paymentService';
import { useNavigate } from 'react-router-dom';
import type { Order } from '@/types'; 
import TableService from '@/api/tableService';
import { groupOrderingService, GroupOrder, Participant } from '@/services/GroupOrderingService';
import { useGroupOrder } from '@/context/GroupOrderContext';
import { Badge } from '@/components/ui/badge';
import { Users, Copy, Heart } from 'lucide-react';
import PaymentStructureSelector, { PaymentStructure } from '@/components/PaymentStructureSelector';

// Order type enum to match API
enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEOUT = 'TAKEOUT'
}

// Order status enum to match API
enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Payment status enum to match API
enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

interface CartItem {
  id: string;
  menuItemId?: string; // Make it optional since it might not always be present
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

interface OrderData {
  restaurantId: string;
  tableId: string;
  items: Array<{
    menuItem: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
    specialInstructions: string;
  }>;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  orderType: OrderType;
  specialInstructions: string;
  serviceFee: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  orderNumber: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { cartItems, removeFromCart: removeItem, updateQuantity, clearCart, addTip } = useCart();
  const { tableId, restaurantName, restaurantId } = useTableInfo();
  const { isAuthenticated, token, user } = useAuth();
  const { addOrder } = useOrders();
  const navigate = useNavigate();
  
  // Group order context
  const { 
    isInGroupOrder: contextIsInGroupOrder, 
    groupOrder: contextGroupOrder,
    currentParticipantId: contextCurrentParticipantId,
    createGroupOrder: contextCreateGroupOrder,
    addItemToGroupCart, 
    getGroupCartItems, 
    refreshGroupOrder,
    leaveGroupOrder: contextLeaveGroupOrder
  } = useGroupOrder();
  
  const [stage, setStage] = useState<'cart' | 'checkout'>('cart');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Group ordering state
  const [isGroupOrder, setIsGroupOrder] = useState(false);
  const [groupOrder, setGroupOrder] = useState<GroupOrder | null>(null);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [isGroupLeader, setIsGroupLeader] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [showGroupOptions, setShowGroupOptions] = useState(false);
  
  // Tab state for the new tab layout
  const [activeTab, setActiveTab] = useState<'individual' | 'group'>('individual');
  const [spendingLimitsEnabled, setSpendingLimitsEnabled] = useState(false);
  const [showSpendingLimitsSettings, setShowSpendingLimitsSettings] = useState(false);
  const [defaultSpendingLimit, setDefaultSpendingLimit] = useState(20); // Default to 20 AED
  const [participantLimits, setParticipantLimits] = useState<Record<string, number>>({});
  const [spendingStatus, setSpendingStatus] = useState<Record<string, any>>({});
  const [showPaymentStructureSelector, setShowPaymentStructureSelector] = useState(false);
  const [selectedPaymentStructure, setSelectedPaymentStructure] = useState<PaymentStructure>('pay_own');
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  // Sync context state with local state
  useEffect(() => {
    if (contextIsInGroupOrder && contextGroupOrder) {
      setIsGroupOrder(true);
      setGroupOrder(contextGroupOrder);
      setCurrentParticipantId(contextCurrentParticipantId);
      setActiveTab('group');
      
      // Check if current user is the group leader
      const currentUser = contextGroupOrder.participants?.find(p => p._id === contextCurrentParticipantId);
      const isLeaderByParticipant = currentUser?.isLeader || false;
      const isLeaderById = contextGroupOrder.groupLeaderId === contextCurrentParticipantId;
      const isLeaderByCreation = contextCurrentParticipantId === 'creator' || contextCurrentParticipantId === contextGroupOrder.groupLeaderId;
      
      
      setIsGroupLeader(isLeaderByParticipant || isLeaderById || isLeaderByCreation);
    } else {
      setIsGroupOrder(false);
      setGroupOrder(null);
      setCurrentParticipantId(null);
      setIsGroupLeader(false);
    }
  }, [contextIsInGroupOrder, contextGroupOrder, contextCurrentParticipantId]);

  // Auto-switch to group tab when in a group order
  useEffect(() => {
    if (isGroupOrder && groupOrder) {
      setActiveTab('group');
    }
  }, [isGroupOrder, groupOrder]);

  // Auto-populate user credentials when user is authenticated
  useEffect(() => {
    if (user && isAuthenticated) {
      // Auto-populate userName from user data
      const fullName = user.name || 
        (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : '') ||
        user.firstName || 
        user.email || 
        'User';
      
      setUserName(fullName);
      setUserEmail(user.email || '');
    }
  }, [user, isAuthenticated]);

  // Derived values - Calculate subtotal including modifiers with proper precision
  const subtotal = Number((cartItems || []).reduce((sum, item) => {
    const itemTotal = (item?.price || 0) * (item?.quantity || 0);
    const modifiersTotal = item?.modifiers 
      ? item.modifiers.reduce((mSum, modifier) => {
          const modPrice = typeof modifier?.price === 'number' ? modifier.price : 0;
          return mSum + modPrice;
        }, 0) * (item?.quantity || 0)
      : 0;
    return sum + itemTotal + modifiersTotal;
  }, 0).toFixed(2));
  // Tax calculation removed - only service charge applies
  const [tipAmount, setTipAmount] = useState(0);
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [venueServiceCharge, setVenueServiceCharge] = useState({ 
    enabled: false, 
    type: 'percentage', 
    value: 0,
    minAmount: undefined,
    maxAmount: undefined
  });
  
  // Calculate service charge based on venue settings
  const serviceCharge = useMemo(() => {
    console.log('💵 Calculating service charge:', { venueServiceCharge, subtotal });
    if (!venueServiceCharge.enabled) {
      console.log('❌ Service charge disabled');
      return 0;
    }

    if (venueServiceCharge.type === 'percentage') {
      const charge = Number((subtotal * (venueServiceCharge.value / 100)).toFixed(2));
      console.log(`✅ Percentage charge: ${subtotal} * ${venueServiceCharge.value}% = ${charge}`);
      return charge;
    } else if (venueServiceCharge.type === 'flat') {
      // Check if order amount is within the specified range for flat rate
      const withinMinAmount = venueServiceCharge.minAmount === undefined || subtotal >= venueServiceCharge.minAmount;
      const withinMaxAmount = venueServiceCharge.maxAmount === undefined || subtotal <= venueServiceCharge.maxAmount;
      
      if (withinMinAmount && withinMaxAmount) {
        const flatCharge = Number(venueServiceCharge.value.toFixed(2));
        console.log(`✅ Flat charge applied: ${flatCharge}`);
        return flatCharge;
      }
    }
    
    console.log('❌ No service charge applied');
    return 0;
  }, [venueServiceCharge, subtotal]);
  
  const total = Number(((subtotal || 0) + (tipAmount || 0) + (serviceCharge || 0)).toFixed(2));

  const [tipPercentage, setTipPercentage] = useState<number | null>(null);
  const tipOptions = [0.15, 0.18, 0.2, 0.22];

  // Group ordering functions
  const handleCreateGroupOrder = async () => {
    if (!tableId) {
      toast.error("Table information not available. Please scan a table QR code first.");
      return;
    }

    // Use restaurantId if available, otherwise use a default or try to get it from table
    let effectiveRestaurantId = restaurantId;
    
    if (!effectiveRestaurantId) {
      try {
        // Try to get restaurant ID from table
        effectiveRestaurantId = await TableService.getRestaurantIdFromTableId(tableId);
      } catch (error) {
        console.log('Could not get restaurant ID from table, using default');
        effectiveRestaurantId = 'default-restaurant'; // Fallback for testing
      }
    }

    try {
      setIsJoiningGroup(true);
      const success = await contextCreateGroupOrder(effectiveRestaurantId, tableId);
      
      if (success) {
        setShowGroupOptions(false);
        setActiveTab('group'); // Switch to group tab automatically
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create group order');
    } finally {
      setIsJoiningGroup(false);
    }
  };

  const handleJoinGroupOrder = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a join code");
      return;
    }

    // Use auto-populated user data (should already be set from useEffect)
    const finalUserName = userName.trim() || user?.name || 
      (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}`.trim() : '') ||
      user?.firstName || 
      'User';
    
    const finalUserEmail = userEmail.trim() || user?.email || '';

    if (!finalUserName || !finalUserEmail) {
      toast.error("User information not available. Please log in first.");
      return;
    }

    try {
      setIsJoiningGroup(true);
      const result = await groupOrderingService.joinGroupOrder({
        joinCode: joinCode.trim(),
        userName: finalUserName,
        email: finalUserEmail
      });

      setGroupOrder(result.groupOrder);
      setCurrentParticipantId(result.participantId);
      setIsGroupLeader(false);
      setIsGroupOrder(true);
      setShowGroupOptions(false);
      setActiveTab('group'); // Switch to group tab automatically
      
      toast.success('Successfully joined the group order!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to join group order');
    } finally {
      setIsJoiningGroup(false);
    }
  };

  const handleLeaveGroupOrder = async () => {
    if (!groupOrder) return;

    try {
      await groupOrderingService.leaveGroupOrder(groupOrder._id);
      setGroupOrder(null);
      setCurrentParticipantId(null);
      setIsGroupLeader(false);
      setIsGroupOrder(false);
      setActiveTab('individual'); // Switch back to individual tab
      toast.success('Left group order');
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave group order');
    }
  };

  const handlePlaceGroupOrder = async () => {
    if (!groupOrder) {
      toast.error('No group order found');
      return;
    }

    if (getGroupCartItems().length === 0) {
      toast.error('Group order is empty');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('🚀 Placing group order:', groupOrder._id);

      // Call the group ordering service to place the final order
      const result = await groupOrderingService.placeFinalOrder(groupOrder._id);

      if (result.success) {
        toast.success('Group order placed successfully!');
        
        // Create individual order entries for each participant based on payment structure
        const groupCartItems = getGroupCartItems();
        const totalAmount = groupCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const participantCount = groupOrder.participants.length;
        
        // Create the base group order structure
        const baseGroupOrder = {
          id: result.orderId,
          _id: result.orderId,
          orderNumber: `GROUP-${groupOrder.joinCode}`,
          items: groupCartItems.map(item => ({
            id: item.id,
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions || '',
            modifiers: item.modifiers || []
          })),
          subtotal: totalAmount,
          tax: 0,
          serviceFee: 0,
          tip: 0,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          timestamp: new Date(),
          createdAt: new Date().toISOString(),
          tableId: tableId || '',
          specialInstructions: 'Group Order',
          isGroupOrder: true,
          groupOrderId: result.orderId,
          groupOrderData: {
            joinCode: groupOrder.joinCode,
            participants: groupOrder.participants.map(p => ({
              _id: p._id,
              userName: p.userName,
              userId: p.userId,
              email: p.email,
              totalAmount: p.totalAmount || 0
            })),
            paymentStructure: selectedPaymentStructure,
            totalParticipants: participantCount,
            participantUserIds: groupOrder.participants.map(p => p.userId).filter(Boolean)
          }
        };
        
        // Calculate payment amounts based on payment structure for current user
        let currentUserOrder = null;
        
        switch (selectedPaymentStructure) {
          case 'pay_all':
            // One person pays for everything - the current user (group leader) pays the full amount
            currentUserOrder = {
              ...baseGroupOrder,
              total: totalAmount,
              userId: user?.id || user?._id || 'group-order-user',
              specialInstructions: `Group Order - Paying for all ${participantCount} participants`
            };
            break;
            
          case 'equal_split':
            // Split equally among all participants
            const amountPerPerson = totalAmount / participantCount;
            currentUserOrder = {
              ...baseGroupOrder,
              total: amountPerPerson,
              userId: user?.id || user?._id || 'group-order-user',
              specialInstructions: `Group Order - Your share (split equally among ${participantCount} participants)`
            };
            break;
            
          case 'pay_own':
            // Each participant pays for their own items
            const currentParticipant = groupOrder.participants.find(p => 
              p.userId === (user?.id || user?._id) || p._id === currentParticipantId
            );
            const currentUserAmount = currentParticipant?.totalAmount || 0;
            currentUserOrder = {
              ...baseGroupOrder,
              total: currentUserAmount,
              userId: user?.id || user?._id || 'group-order-user',
              specialInstructions: `Group Order - Your items only ($${currentUserAmount.toFixed(2)})`
            };
            break;
            
          case 'custom_split':
            // Custom split amounts (to be implemented later)
            const customAmount = groupOrder.customSplits?.[currentParticipantId || ''] || (totalAmount / participantCount);
            currentUserOrder = {
              ...baseGroupOrder,
              total: customAmount,
              userId: user?.id || user?._id || 'group-order-user',
              specialInstructions: `Group Order - Custom split amount`
            };
            break;
            
          default:
            // Default to pay_own
            const defaultParticipant = groupOrder.participants.find(p => 
              p.userId === (user?.id || user?._id) || p._id === currentParticipantId
            );
            const defaultAmount = defaultParticipant?.totalAmount || 0;
            currentUserOrder = {
              ...baseGroupOrder,
              total: defaultAmount,
              userId: user?.id || user?._id || 'group-order-user',
              specialInstructions: `Group Order - Your items only`
            };
        }
        
        // Add the current user's order to the context
        if (currentUserOrder) {
          addOrder(currentUserOrder);
        }
        
        // Store group order information for other participants to access when they visit My Orders
        const participantOrdersData = {
          groupOrderId: result.orderId,
          joinCode: groupOrder.joinCode,
          paymentStructure: selectedPaymentStructure,
          totalAmount: totalAmount,
          participantCount: participantCount,
          items: groupCartItems,
          participants: groupOrder.participants.map(p => ({
            _id: p._id,
            userName: p.userName,
            userId: p.userId,
            email: p.email,
            totalAmount: p.totalAmount || 0
          })),
          placedAt: new Date().toISOString(),
          tableId: tableId,
          orderNumber: `GROUP-${groupOrder.joinCode}`,
          status: 'PENDING',
          paymentStatus: 'PENDING'
        };
        
        // Store this data so other participants can see their orders when they visit My Orders
        localStorage.setItem(`groupOrder_${result.orderId}`, JSON.stringify(participantOrdersData));
        
        // Clear any individual cart items
        clearCart();
        
        // Don't try to leave the group via API after successful placement
        // The group order has been submitted and converted to a regular order
        console.log('Group order placed successfully, clearing local state only');
        
        // Reset local group order state immediately
        setGroupOrder(null);
        setCurrentParticipantId(null);
        setIsGroupLeader(false);
        setIsGroupOrder(false);
        setActiveTab('individual');
        
        // Force clear session storage
        sessionStorage.removeItem('currentGroupOrder');
        sessionStorage.removeItem('currentParticipantId');
        
        // Close the drawer before navigation
        onClose();
        
        // Small delay to ensure state is cleared before navigation
        setTimeout(() => {
          navigate(`/my-orders?table=${tableId}&groupOrder=${result.orderId}`);
        }, 100);
      } else {
        toast.error('Failed to place group order');
      }
    } catch (error: any) {
      console.error('Failed to place group order:', error);
      toast.error(error.message || 'Failed to place group order');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyGroupOrderLink = async () => {
    if (!groupOrder) return;

    try {
      const groupOrderLink = `${window.location.origin}/group-order/${groupOrder.joinCode}`;
      await navigator.clipboard.writeText(groupOrderLink);
      toast.success('Group order link copied to clipboard!');
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = `${window.location.origin}/group-order/${groupOrder.joinCode}`;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Group order link copied to clipboard!');
      } catch (fallbackError) {
        toast.error('Failed to copy link. Please copy manually: ' + `${window.location.origin}/group-order/${groupOrder.joinCode}`);
      }
    }
  };

  // Spending limit handlers
  const handleSpendingLimitsToggle = async (enabled: boolean) => {
    if (!groupOrder || !isGroupLeader) return;
    
    try {
      setSpendingLimitsEnabled(enabled);
      await groupOrderingService.updateSpendingLimits(groupOrder._id, {
        enabled,
        defaultLimit: enabled ? defaultSpendingLimit : null
      });
      toast.success(`Spending limits ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update spending limits');
      setSpendingLimitsEnabled(!enabled); // Revert on error
    }
  };

  const handleDefaultLimitChange = async (limit: number) => {
    if (!groupOrder || !isGroupLeader || !spendingLimitsEnabled) return;
    
    try {
      await groupOrderingService.updateSpendingLimits(groupOrder._id, {
        enabled: true,
        defaultLimit: limit
      });
      toast.success('Default spending limit updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update default limit');
    }
  };

  const handleParticipantLimitChange = async (participantId: string, limit: number | null) => {
    if (!groupOrder || !isGroupLeader || !spendingLimitsEnabled) return;
    
    try {
      await groupOrderingService.updateParticipantSpendingLimit(
        groupOrder._id,
        participantId,
        limit
      );
      
      // Update local state
      if (limit === null) {
        setParticipantLimits(prev => {
          const updated = { ...prev };
          delete updated[participantId];
          return updated;
        });
      } else {
        setParticipantLimits(prev => ({ ...prev, [participantId]: limit }));
      }
      
      toast.success('Spending limit updated');
      
      // Update spending status
      updateSpendingStatus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update participant limit');
    }
  };

  const updateSpendingStatus = () => {
    if (!groupOrder || !spendingLimitsEnabled) return;
    
    const newStatus: Record<string, any> = {};
    
    groupOrder.participants.forEach(participant => {
      const status = groupOrderingService.checkParticipantSpendingStatus(
        groupOrder,
        participant._id
      );
      newStatus[participant._id] = status;
    });
    
    setSpendingStatus(newStatus);
  };

  // Update spending status when relevant data changes
  useEffect(() => {
    updateSpendingStatus();
  }, [groupOrder, spendingLimitsEnabled, participantLimits]);

  // Handle payment structure selection
  const handlePaymentStructureSelect = async (structure: PaymentStructure, splits?: Record<string, number>) => {
    if (!groupOrder || !isGroupLeader) return;
    
    try {
      setSelectedPaymentStructure(structure);
      if (splits) {
        setCustomSplits(splits);
      }
      
      await groupOrderingService.updatePaymentStructure(groupOrder._id, structure, splits);
      
      // Refresh group order data to reflect the changes
      const updatedGroupOrder = await groupOrderingService.getGroupOrder(groupOrder._id);
      setGroupOrder(updatedGroupOrder);
      
      setShowPaymentStructureSelector(false);
      toast.success('Payment structure updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update payment structure');
    }
  };

  // Initialize custom splits when opening payment structure selector
  useEffect(() => {
    if (showPaymentStructureSelector && groupOrder && selectedPaymentStructure === 'custom_split') {
      const initialSplits: Record<string, number> = {};
      groupOrder.participants.forEach(p => {
        initialSplits[p._id] = customSplits[p._id] || p.totalAmount;
      });
      setCustomSplits(initialSplits);
    }
  }, [showPaymentStructureSelector, groupOrder, selectedPaymentStructure]);

  // Initialize payment structure from group order data
  useEffect(() => {
    const initializePaymentStructure = async () => {
      if (groupOrder && isGroupLeader) {
        try {
          const { paymentStructure, customSplits: splits } = await groupOrderingService.getPaymentStructure(groupOrder._id);
          setSelectedPaymentStructure(paymentStructure);
          if (splits) {
            setCustomSplits(splits);
          }
        } catch (error) {
          // If error, use default payment structure
          console.log('Could not fetch payment structure, using default');
        }
      }
    };

    initializePaymentStructure();
  }, [groupOrder, isGroupLeader]);

  // Fetch venue service charge settings when component loads or table changes
  useEffect(() => {
    const fetchVenueServiceCharge = async () => {
      try {
        console.log('🔍 Fetching service charge for tableId:', tableId);
        if (!tableId) return;
        
        // First get table data to find venueId
        const tableResponse = await apiClient.get(`/api/restaurant-service/tables/${tableId}`);
        console.log('📋 Table data:', tableResponse.data);
        
        // Extract venueId - handle both string ID and populated object
        const venueId = typeof tableResponse.data.venueId === 'string' 
          ? tableResponse.data.venueId 
          : tableResponse.data.venueId?._id;
        console.log('📍 Found venueId:', venueId);
        
        // If venue data is already populated, use it directly
        if (typeof tableResponse.data.venueId === 'object' && tableResponse.data.venueId?.serviceCharge) {
          console.log('🏢 Venue data already available from table response');
          console.log('💰 Service charge settings:', tableResponse.data.venueId.serviceCharge);
          setVenueServiceCharge(tableResponse.data.venueId.serviceCharge);
          return;
        }
        
        if (venueId) {
          // Use direct backend URL to avoid frontend routing issues
          const response = await fetch(`http://localhost:3001/api/venues/${venueId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            const venueData = await response.json();
            console.log('🏢 Venue data:', venueData);
            
            if (venueData.serviceCharge) {
              console.log('💰 Service charge settings:', venueData.serviceCharge);
              setVenueServiceCharge(venueData.serviceCharge);
            }
          } else {
            console.log('❌ Failed to fetch venue:', response.status, response.statusText);
          }
        }
      } catch (error) {
        console.log('Could not fetch venue service charge settings:', error);
        // Keep default values (disabled) - don't show error to user as it's optional
      }
    };

    fetchVenueServiceCharge();
  }, [tableId]);

  // Handle tip selection
  const handleTipSelection = (percentage: number | null) => {
    setTipPercentage(percentage);

    if (percentage === null) {
      setTipAmount(0);
      addTip(0);
    } else {
      // Calculate tip based on subtotal + service charge for consistency
      const baseAmountForTip = Number(subtotal) + (serviceCharge || 0);
      const newTipAmount = Number((baseAmountForTip * percentage).toFixed(2));
      console.log(`Calculating tip: ${percentage * 100}% of ($${subtotal} + $${serviceCharge}) = $${newTipAmount}`);
      setTipAmount(newTipAmount);
      addTip(newTipAmount);
    }
  };

  // Helper function to check authentication using the auth context
  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status from CartDrawer');
      console.log('Current auth state:', { isAuthenticated, token, user: user?.email });
      
      // First check if we're already authenticated in the context
      // For credential users, token might be in cookies, so we check isAuthenticated && user
      if (isAuthenticated && user) {
        console.log('User is authenticated in context');
        return true;
      }
      
      // If not authenticated in context but we have cookies, try to refresh auth
      const cookies = document.cookie.split(';').map(c => c.trim());
      const hasAuthCookies = cookies.some(cookie => 
        cookie.startsWith('access_token=') || 
        cookie.startsWith('auth_token=') ||
        cookie.startsWith('refresh_token=')
      );
      
      if (hasAuthCookies) {
        console.log('Found auth cookies, attempting to refresh auth state');
        
        // Try to get current user from customer auth service
        try {
          const customerResponse = await customerAuthService.getCurrentUser();
          if (customerResponse.success && customerResponse.user) {
            console.log('Successfully refreshed auth state via customer service');
            
            // Dispatch auth state change event to update the context
            window.dispatchEvent(new CustomEvent('auth-state-changed', { 
              detail: { 
                isAuthenticated: true, 
                user: customerResponse.user 
              } 
            }));
            
            return true;
          }
        } catch (error) {
          console.log('Customer auth service failed, trying regular auth service');
          
          // Fallback to regular auth service
          try {
            const authResponse = await authService.getCurrentUser();
            if (authResponse.success && authResponse.user) {
              console.log('Successfully refreshed auth state via auth service');
              
              // Dispatch auth state change event
              window.dispatchEvent(new CustomEvent('auth-state-changed', { 
                detail: { 
                  isAuthenticated: true, 
                  user: authResponse.user 
                } 
              }));
              
              return true;
            }
          } catch (authError) {
            console.log('Both auth services failed');
          }
        }
      }
      
      console.log('User is not authenticated');
      return false;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  };
  
  // Helper function to process the order
  const processOrder = async () => {
    try {
      if (!tableId) {
        throw new Error('Table ID is required to place an order');
      }

      // Get restaurant ID from table using the TableService
      console.log('Getting restaurant ID from table:', tableId);
      let restaurantId;
      
      try {
        restaurantId = await TableService.getRestaurantIdFromTableId(tableId);
        console.log('Successfully got restaurant ID from table:', restaurantId);
        
        // Validate restaurant ID
        if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
          throw new Error('Invalid restaurant ID returned from table service');
        }
      } catch (tableError) {
        console.error('Failed to get restaurant ID from table:', tableError);
        throw new Error('Unable to determine restaurant for this table. Please scan the QR code again or contact support.');
      }
      
      // Format items according to API schema
      const formattedItems = cartItems.map(item => {
        // Ensure we have a valid string for menuItem
        let menuItemId = ('menuItemId' in item && item.menuItemId) || item.id;
        
        // Clean the menuItemId to extract only the ObjectId part (first 24 characters)
        // Remove any timestamp suffix that might be appended
        if (menuItemId && menuItemId.includes('-')) {
          menuItemId = menuItemId.split('-')[0];
        }
        
        // Ensure it's a valid ObjectId format (24 hex characters)
        if (menuItemId && menuItemId.length > 24) {
          menuItemId = menuItemId.substring(0, 24);
        }
        
        // Ensure menuItem is always a string
        const menuItem = String(menuItemId || '');
        
        // Calculate subtotal including modifiers with proper precision
        const modifiersTotal = item.modifiers 
          ? item.modifiers.reduce((mSum, modifier) => mSum + modifier.price, 0) * item.quantity
          : 0;
        const itemSubtotal = Number(((item.price * item.quantity) + modifiersTotal).toFixed(2));

        // Format modifiers according to backend API schema
        const formattedModifiers: any[] = [];
        
        if (item.modifiers && item.modifiers.length > 0) {
          // Group modifiers by groupId
          const modifierGroups = item.modifiers.reduce((groups, modifier) => {
            if (modifier.groupId) {
              if (!groups[modifier.groupId]) {
                groups[modifier.groupId] = [];
              }
              groups[modifier.groupId].push(modifier);
            }
            return groups;
          }, {} as Record<string, any[]>);
          
          // Convert to the expected format
          Object.entries(modifierGroups).forEach(([groupId, selections]) => {
            formattedModifiers.push({
              groupId,
              selections: selections.map(sel => ({
                optionId: sel.optionId,
                name: sel.name,
                quantity: 1,
                price: sel.price
              }))
            });
          });
        }

        return {
          menuItem,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: itemSubtotal,
          specialInstructions: item.specialInstructions || '',
          modifiers: formattedModifiers
        };
      });
      
      // Format order data according to API schema with proper precision
      const constructedOrderData: OrderData = {
        restaurantId, // Use restaurant ID from table service
        tableId,
        items: formattedItems,
        subtotal: Number((subtotal || 0).toFixed(2)),
        tax: 0, // No tax applied, only service charge
        tip: Number((tipAmount || 0).toFixed(2)),
        total: Number((total || 0).toFixed(2)),
        orderType,
        specialInstructions: specialInstructions || '',
        serviceFee: Number((serviceCharge || 0).toFixed(2)),
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      };

      console.log('💰 CartDrawer serviceCharge calculation debug:', {
        serviceCharge,
        venueServiceCharge,
        subtotal,
        tipAmount,
        total
      });
      
      console.log('💰 Order pricing breakdown:', {
        subtotal: Number((subtotal || 0).toFixed(2)),
        serviceCharge: Number((serviceCharge || 0).toFixed(2)),
        tipAmount: Number((tipAmount || 0).toFixed(2)),
        total: Number((total || 0).toFixed(2)),
        calculatedTotal: Number((subtotal || 0).toFixed(2)) + Number((serviceCharge || 0).toFixed(2)) + Number((tipAmount || 0).toFixed(2))
      });

      console.log('🚀 CRITICAL: serviceFee being sent to backend:', constructedOrderData.serviceFee);

      console.log('Placing order...');
      console.log('Order data for service:', JSON.stringify(constructedOrderData));
      
      // Try to get a token from all possible sources
      let token = localStorage.getItem('auth_token');
      
      // Clean up the placeholder if it exists
      if (token === 'http-only-cookie-present') {
        localStorage.removeItem('auth_token');
        token = null;
      }
      
      // If no token found yet, try to extract from non-HTTP-only cookies (guest users)
      if (!token) {
        const cookies = document.cookie.split(';');
        const tokenCookie = cookies.find(cookie => 
          cookie.trim().startsWith('auth_token=') || 
          cookie.trim().startsWith('jwt=')
        );
        
        if (tokenCookie) {
          token = tokenCookie.split('=')[1].trim();
        }
      }
      
      // Check if we have HTTP-only cookies (credential users)
      const cookies = document.cookie.split(';').map(c => c.trim());
      const hasHttpOnlyCookies = cookies.some(cookie => 
        cookie.startsWith('access_token=') || 
        cookie.startsWith('refresh_token=') ||
        cookie.startsWith('_dd_s=') // DataDog session cookie indicates HTTP-only cookies
      );
      
      console.log('Token status:', {
        hasLocalStorageToken: !!token,
        hasHttpOnlyCookies,
        tokenLength: token ? token.length : 0,
        user: user ? { id: user.id, email: user.email, role: user.role } : 'No user',
        isAuthenticated
      });
      
      try {
        // Use XMLHttpRequest for order creation
        console.log('Using XMLHttpRequest for order creation...');
        
        const result = await new Promise<OrderResponseData>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const orderApiUrl = import.meta.env.VITE_ORDER_API_URL || `${API_BASE_URL}/orders`;
          xhr.open('POST', orderApiUrl, true);
          xhr.withCredentials = true; // This ensures HTTP-only cookies are sent
          xhr.setRequestHeader('Content-Type', 'application/json');
          
          // Only add Authorization header if we have a valid token (not for HTTP-only cookie users)
          if (token && token !== 'http-only-cookie-present' && token.length > 10) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            console.log('Added Authorization header with token');
          } else if (hasHttpOnlyCookies) {
            console.log('Using HTTP-only cookies for authentication (no Authorization header needed)');
          } else {
            console.warn('No authentication token available. Order creation may fail.');
          }
          
          xhr.onload = async function() {
            console.log('XHR response received:', {
              status: xhr.status,
              statusText: xhr.statusText,
              responseText: xhr.responseText.substring(0, 500) + (xhr.responseText.length > 500 ? '...' : '')
            });
            
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const parsedResponse = JSON.parse(xhr.responseText);
                console.log('Parsed response:', parsedResponse);
                
                // Check if response has success property (API v1 format)
                if (parsedResponse.success !== undefined) {
                  if (parsedResponse.success) {
                    console.log('Order creation successful via API v1 format');
                    resolve(parsedResponse.data);
                  } else {
                    console.error('Order creation failed despite 200 status:', parsedResponse.error);
                    reject(new Error(parsedResponse.error?.message || 'Order creation failed'));
                  }
                } 
                // If no success property but has _id, it's a direct order object (API v2 format)
                else if (parsedResponse._id) {
                  console.log('Order creation successful via API v2 format (direct order object)');
                  resolve(parsedResponse);
                } 
                // Unknown response format
                else {
                  console.error('Unknown response format:', parsedResponse);
                  reject(new Error('Unexpected response format from server'));
                }
              } catch (e) {
                console.error('Failed to parse JSON response:', e, 'Response text:', xhr.responseText);
                reject(new Error('Invalid response format from server'));
              }
            } else {
              console.error(`Order creation failed with status: ${xhr.status} ${xhr.statusText}`, xhr.responseText);
              try {
                const errorData = JSON.parse(xhr.responseText);
                const errorMessage = errorData.error?.message || errorData.message || errorData.error || `Server error: ${xhr.status}`;
                reject(new Error(errorMessage));
              } catch (e) {
                reject(new Error(`Server error: ${xhr.status} ${xhr.statusText}`));
              }
            }
          };
          
          xhr.onerror = function() {
            console.error('XHR error:', xhr);
            reject(new Error('Network error occurred'));
          };
          
          xhr.send(JSON.stringify(constructedOrderData));
        });
        
        console.log('Order placed successfully:', result);
        toast.success('Order placed successfully!');
      
        // Transform OrderResponseData to Order type for the context with proper precision
        const orderForContext: Order = {
          id: result._id,
          _id: result._id, // Also include _id for consistency
          orderNumber: result.orderNumber,
          items: result.items.map(apiItem => ({
            id: apiItem.menuItem,
            menuItemId: apiItem.menuItem,
            name: apiItem.name,
            price: apiItem.price,
            quantity: apiItem.quantity,
            specialInstructions: apiItem.specialInstructions,
            modifiers: apiItem.modifiers?.map(mod => ({ id: mod.name, name: mod.name, price: mod.price })) || []
          })),
          subtotal: Number((result.subtotal || 0).toFixed(2)),
          tax: 0, // No tax applied, only service charge
          serviceFee: Number((result.serviceFee || result.service_charge || 0).toFixed(2)),
          service_charge: Number((result.serviceFee || result.service_charge || 0).toFixed(2)), // Include both field names for compatibility
          tip: Number((result.tip || 0).toFixed(2)),
          total: Number((result.total || 0).toFixed(2)),
          status: result.status,
          paymentStatus: result.paymentStatus,
          timestamp: new Date(result.createdAt),
          createdAt: result.createdAt, // Also include createdAt for filtering
          tableId: result.tableId,
          userId: result.userId, // Include userId for filtering
          specialInstructions: result.specialInstructions
        } as any;

        console.log('Adding order to context:', orderForContext);
        addOrder(orderForContext);

        console.log('Order created successfully:', result);
        
        // Store order ID in localStorage for retrieval after payment
        localStorage.setItem('pending_order_id', result._id);
        
        // Clear the cart and close the drawer
        clearCart();
        onClose();
        
        // Show success message
        toast.success('Order placed successfully!');
        
        // Reset processing state before navigation
        setIsProcessing(false);
        
        // Wait a moment to ensure the order context has been updated
        setTimeout(() => {
          console.log('Redirecting to my-orders page with table ID:', tableId);
          navigate(`/my-orders?table=${tableId}`);
        }, 500); // Reduced delay since context update is now immediate
      } catch (error) {
        console.error('Order creation failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create your order';
        toast.error(errorMessage);
        
        // Handle authentication errors specifically
        if (errorMessage.includes('session has expired') || 
            errorMessage.includes('Authentication') || 
            errorMessage.includes('Unauthorized')) {
          // Clear invalid tokens
          localStorage.removeItem('auth_token');
          // Redirect to login
          onClose();
          navigate('/login', { state: { returnUrl: '/cart' } });
        }
      }
    } catch (error) {
      console.error('Error in processOrder:', error);
      throw error;
    }
  };

  const handlePlaceOrder = async () => {
    console.log('handlePlaceOrder function entered - CartDrawer.tsx');
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    if (!tableId) {
      toast.error('Please scan a table QR code first');
      onClose();
      navigate('/scan-table');
      return;
    }
    
    // Check spending limits for group orders
    if (isGroupOrder && groupOrder && currentParticipantId && spendingLimitsEnabled) {
      const cartTotal = cartItems.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity;
        const modifiersTotal = item.modifiers 
          ? item.modifiers.reduce((mSum, modifier) => mSum + modifier.price, 0) * item.quantity
          : 0;
        return sum + itemTotal + modifiersTotal;
      }, 0);
      
      const limitCheck = groupOrderingService.canAddItemsWithinLimit(groupOrder, currentParticipantId, cartTotal);
      
      if (!limitCheck.canAdd) {
        toast.error(
          limitCheck.exceedsBy 
            ? `Your order exceeds your spending limit by $${limitCheck.exceedsBy.toFixed(2)}. Please remove some items or ask the group leader to adjust your limit.`
            : 'Your order exceeds your spending limit. Please remove some items.'
        );
        setIsProcessing(false);
        return;
      }
      
      if (limitCheck.isApproachingLimit) {
        toast.warning(`You are approaching your spending limit of $${limitCheck.limit?.toFixed(2)}.`);
      }
    }
    
    // Clear any existing pending order ID to prevent conflicts
    localStorage.removeItem('pending_order_id');
    
    setIsProcessing(true);
    setError('');
    
    try {
      console.log('Starting order placement process...');
      
      // Check if user is authenticated
      const isAuthenticated = await checkAuthStatus();
      console.log('Auth check result:', isAuthenticated);
      
      if (!isAuthenticated) {
        console.log('User not authenticated - redirecting to login');
        
        // Save cart data to restore after login
        localStorage.setItem('pendingCart', JSON.stringify(cartItems));
        if (tableId) {
          localStorage.setItem('pendingTableId', tableId);
        }
        
        // Show error message and stop processing
        toast.error('Please log in or create an account to place an order');
        setIsProcessing(false);
        onClose();
        
        // Redirect to login page with return URL
        navigate('/login', { state: { returnUrl: window.location.pathname } });
        return;
      }
      
      // If we get here, user is authenticated - proceed with order regardless of token storage method
      console.log('User is authenticated, proceeding with order placement...');
      await processOrder();
    } catch (error) {
      console.error('Error during order placement:', error);
      let errorMessage = 'Failed to process your order';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      
      // Handle authentication-related errors
      const isAuthError = errorMessage.toLowerCase().includes('session') || 
                         errorMessage.toLowerCase().includes('auth') || 
                         errorMessage.toLowerCase().includes('token') ||
                         errorMessage.toLowerCase().includes('401') ||
                         errorMessage.toLowerCase().includes('403');
      
      if (isAuthError) {
        // Clear all auth tokens
        console.log('Clearing auth tokens due to authentication error');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('access_token');
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        toast.error('Your session has expired. Please log in again.');
        setIsProcessing(false);
        onClose();
        navigate('/login', { state: { returnUrl: '/cart' } });
      } else {
        // For other errors, just show the message
        console.error('Non-auth error during order placement:', errorMessage);
        toast.error(errorMessage);
        setIsProcessing(false);
      }
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          {/* Tab Layout */}
          <div className="flex w-full border-b">
            <button
              onClick={() => setActiveTab('individual')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'individual'
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              Your Order
            </button>
            <button
              onClick={() => setActiveTab('group')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                activeTab === 'group'
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Users className="h-4 w-4" />
              Group Order
              {isGroupOrder && groupOrder && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {groupOrder.joinCode}
                </Badge>
              )}
            </button>
          </div>
        </SheetHeader>
        
        <div className="flex flex-col h-full">
          {/* Tab Content */}
          {activeTab === 'individual' && (
            <div className="flex-1 overflow-auto">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-gray-500 mb-4">Your cart is empty</p>
                  <Button onClick={onClose} variant="outline">
                    Continue browsing menu
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                        
                        {/* Show modifiers if any */}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-600">Modifiers:</p>
                            {item.modifiers.map((modifier, index) => (
                              <p key={index} className="text-xs text-gray-500">
                                • {modifier.name} (+${modifier.price.toFixed(2)})
                              </p>
                            ))}
                          </div>
                        )}
                        
                        {/* Show special instructions if any */}
                        {item.specialInstructions && (
                          <p className="text-xs text-gray-600 mt-1">
                            Note: {item.specialInstructions}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {cartItems.length > 0 && (
                <div className="border-t pt-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {venueServiceCharge.enabled && serviceCharge > 0 && (
                      <div className="flex justify-between">
                        <span>
                          Service Charge {venueServiceCharge.type === 'percentage' 
                            ? `(${venueServiceCharge.value}%)` 
                            : '(Flat Rate)'
                          }:
                        </span>
                        <span>${serviceCharge.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tip:</span>
                      <span>${tipAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Tip Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tip</label>
                    <div className="grid grid-cols-5 gap-2">
                      {tipOptions.map((percentage) => (
                        <Button
                          key={percentage}
                          variant={tipPercentage === percentage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleTipSelection(percentage)}
                          className="text-xs"
                        >
                          {Math.round(percentage * 100)}%
                        </Button>
                      ))}
                      <Button
                        variant={tipPercentage === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTipSelection(null)}
                        className="text-xs"
                      >
                        No Tip
                      </Button>
                    </div>
                  </div>

                  {/* Special Instructions */}
                  <div className="space-y-2">
                    <label htmlFor="special-instructions" className="text-sm font-medium">
                      Special Instructions (Optional)
                    </label>
                    <Textarea
                      id="special-instructions"
                      placeholder="Any special requests for your order..."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      rows={3}
                      className="w-full"
                    />
                  </div>
                    
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Place Order'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Group Order Tab Content */}
          {activeTab === 'group' && (
            <div className="flex-1 overflow-auto space-y-4">
              {/* Group order items display */}
              {isGroupOrder && groupOrder && !showGroupOptions && (
                <div className="p-4 border rounded-lg bg-card">
                  <h3 className="text-sm font-medium mb-3">Group Order Items</h3>
                  
                  {getGroupCartItems().length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-muted-foreground">No items in group order yet</p>
                    </div>
                  ) : (
                    <>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {getGroupCartItems().map((item) => {
                        // Find which participant added this item from finalOrder
                        let participant = null;
                        
                        // Try to find the item in finalOrder and get addedBy information
                        const finalOrderItem = groupOrder.finalOrder?.find(fItem => 
                          fItem.itemId === item.id || fItem.menuItemId === item.id
                        );
                        
                        if (finalOrderItem && finalOrderItem.addedBy) {
                          // Find participant by userId matching addedBy
                          participant = groupOrder.participants?.find(p => 
                            p.userId === finalOrderItem.addedBy || p._id === finalOrderItem.addedBy
                          );
                        }
                        
                        // Fallback: try to match by item in participant items
                        if (!participant) {
                          participant = groupOrder.participants?.find(p => 
                            p.items?.some(pItem => 
                              pItem.itemId === item.id || 
                              (pItem.menuItemId === item.id) ||
                              (pItem.menuItemName === item.name && pItem.menuItemId && item.id.includes(pItem.menuItemId))
                            )
                          ) || 
                          // Final fallback: try to find by matching name
                          groupOrder.participants?.find(p => 
                            p.items?.some(pItem => pItem.menuItemName === item.name)
                          );
                        }
                        
                        return (
                          <div key={item.id} className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-medium">{item.name}</h4>
                              <span className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>Qty: {item.quantity} × ${item.price.toFixed(2)}</span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Added by: {participant?.userName || 'Unknown'}
                              </span>
                            </div>
                            
                            {/* Show modifiers if any */}
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="mt-1">
                                <p className="text-xs text-muted-foreground">Modifiers:</p>
                                {item.modifiers.map((modifier, index) => (
                                  <p key={index} className="text-xs text-muted-foreground ml-2">
                                    • {modifier.name} (+${modifier.price.toFixed(2)})
                                  </p>
                                ))}
                              </div>
                            )}
                            
                            {/* Show special instructions if any */}
                            {item.specialInstructions && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Note: {item.specialInstructions}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Total calculation for group order items */}
                    <div className="mt-4 pt-3 border-t">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span>Total:</span>
                        <span>${getGroupCartItems().reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
                      </div>
                    </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Group ordering options when not in a group */}
              {(!isGroupOrder || showGroupOptions) && (
                <div className="p-4 border rounded-lg bg-card">
                  <h3 className="font-medium mb-3">Join or Create Group Order</h3>
                  
                  <div className="space-y-4">
                    {/* Create new group */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Create New Group</h4>
                      <Button
                        onClick={handleCreateGroupOrder}
                        disabled={isJoiningGroup || !tableId}
                        className="w-full"
                        size="sm"
                      >
                        {isJoiningGroup ? 'Creating...' : 'Create Group Order'}
                      </Button>
                    </div>

                    {/* Join existing group */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Join Existing Group</h4>
                      <div className="space-y-2">
                        <Input
                          placeholder="Join Code"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          className="font-mono text-sm"
                        />
                        
                        {/* Show user info in read-only format */}
                        {user && isAuthenticated && (
                          <div className="p-3 bg-muted/30 rounded-md border space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Info className="h-3 w-3" />
                              <span>Your information will be used for the group order:</span>
                            </div>
                            <div className="text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-medium">{userName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Email:</span>
                                <span className="font-medium">{userEmail || user.email || 'Not provided'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Show warning if not authenticated */}
                        {(!user || !isAuthenticated) && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <div className="flex items-center gap-2 text-xs text-yellow-800">
                              <AlertCircle className="h-3 w-3" />
                              <span>Please log in to join a group order</span>
                            </div>
                          </div>
                        )}
                        
                        <Button
                          onClick={handleJoinGroupOrder}
                          disabled={isJoiningGroup || !joinCode.trim() || !user || !isAuthenticated}
                          className="w-full"
                          size="sm"
                        >
                          {isJoiningGroup ? 'Joining...' : 'Join Group'}
                        </Button>
                      </div>
                    </div>
                    
                    {isGroupOrder && (
                      <Button
                        variant="ghost"
                        onClick={() => setShowGroupOptions(false)}
                        className="w-full"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Group order participants and details */}
              {isGroupOrder && groupOrder && !showGroupOptions && (
                <div className="space-y-4">
                  {/* Spending Limits Section - Only show for group leaders */}
                  {isGroupLeader && (
                    <div className="p-4 border rounded-lg bg-card">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Spending Limits
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSpendingLimitsSettings(!showSpendingLimitsSettings)}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* Toggle spending limits */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-muted-foreground">Enable spending limits</span>
                        <Button
                          variant={spendingLimitsEnabled ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSpendingLimitsToggle(!spendingLimitsEnabled)}
                          className="text-xs h-7"
                        >
                          {spendingLimitsEnabled ? 'Enabled' : 'Disabled'}
                        </Button>
                      </div>
                      
                      {/* Spending limits settings */}
                      {spendingLimitsEnabled && showSpendingLimitsSettings && (
                        <div className="space-y-3 border-t pt-3">
                          {/* Default limit */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Default limit (AED)</label>
                            <Input
                              type="number"
                              value={defaultSpendingLimit}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setDefaultSpendingLimit(value);
                              }}
                              onBlur={() => handleDefaultLimitChange(defaultSpendingLimit)}
                              className="text-xs h-7"
                              min="0"
                              step="5"
                            />
                          </div>
                          
                          {/* Individual participant limits */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium">Individual limits</label>
                            {groupOrder.participants.map((participant) => {
                              const currentLimit = participant.spendingLimit || 
                                                 participantLimits[participant._id] || 
                                                 defaultSpendingLimit;
                              return (
                                <div key={participant._id} className="flex items-center gap-2">
                                  <span className="text-xs flex-1 truncate">
                                    {participant.userName}
                                    {participant._id === currentParticipantId && ' (You)'}
                                  </span>
                                  <Input
                                    type="number"
                                    value={currentLimit}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      setParticipantLimits(prev => ({
                                        ...prev,
                                        [participant._id]: value
                                      }));
                                    }}
                                    onBlur={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      handleParticipantLimitChange(participant._id, value);
                                    }}
                                    className="text-xs h-6 w-16"
                                    min="0"
                                    step="5"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleParticipantLimitChange(participant._id, null)}
                                    className="text-xs h-6 px-2"
                                  >
                                    Reset
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Spending status overview */}
                      {spendingLimitsEnabled && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">Spending Overview</div>
                          {groupOrder.participants.map((participant) => {
                            const status = spendingStatus[participant._id];
                            if (!status || status.status === 'no_limit') return null;
                            
                            const progressPercentage = status.percentageUsed || 0;
                            const isExceeded = status.status === 'exceeded_limit';
                            const isApproaching = status.status === 'approaching_limit';
                            
                            return (
                              <div key={participant._id} className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs">
                                    {participant.userName}
                                    {participant._id === currentParticipantId && ' (You)'}
                                  </span>
                                  <span className={cn(
                                    "text-xs font-medium",
                                    isExceeded ? "text-red-600" : 
                                    isApproaching ? "text-yellow-600" : "text-green-600"
                                  )}>
                                    ${status.currentSpending.toFixed(2)} / ${status.limit?.toFixed(2)}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={cn(
                                      "h-2 rounded-full transition-all",
                                      isExceeded ? "bg-red-500" : 
                                      isApproaching ? "bg-yellow-500" : "bg-green-500"
                                    )}
                                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                  />
                                </div>
                                {isExceeded && (
                                  <div className="text-xs text-red-600">
                                    Exceeds limit by ${((status.currentSpending || 0) - (status.limit || 0)).toFixed(2)}
                                  </div>
                                )}
                                {isApproaching && !isExceeded && (
                                  <div className="text-xs text-yellow-600">
                                    Approaching limit ({progressPercentage.toFixed(0)}% used)
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Structure Selector - Only show for group leaders */}
                  {isGroupLeader && (
                    <div className="p-4 border rounded-lg bg-card">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Payment Structure
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPaymentStructureSelector(!showPaymentStructureSelector)}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {showPaymentStructureSelector ? (
                        <PaymentStructureSelector
                          totalAmount={getGroupCartItems().reduce((sum, item) => sum + (item.price * item.quantity), 0)}
                          participantCount={groupOrder.participants.length}
                          isGroupLeader={isGroupLeader}
                          currentParticipantId={currentParticipantId || ''}
                          participants={groupOrder.participants.map(p => {
                            // Calculate actual participant amount from their items
                            const participantItems = getGroupCartItems().filter(item => {
                              const finalOrderItem = groupOrder.finalOrder?.find(fItem => 
                                fItem.itemId === item.id || fItem.menuItemId === item.id
                              );
                              return finalOrderItem && finalOrderItem.addedBy === p._id;
                            });
                            const participantTotal = participantItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                            
                            return {
                              _id: p._id,
                              userName: p.userName,
                              totalAmount: participantTotal
                            };
                          })}
                          onPaymentStructureSelect={handlePaymentStructureSelect}
                        />
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Current: <span className="font-medium">
                            {selectedPaymentStructure === 'pay_all' ? 'One person pays all' :
                             selectedPaymentStructure === 'equal_split' ? 'Split equally' :
                             selectedPaymentStructure === 'pay_own' ? 'Pay for own orders' :
                             'Custom split'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                
                  <div className="p-4 border rounded-lg bg-card">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium">Group Members ({groupOrder.participants.length})</h3>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded font-mono text-xs">{groupOrder.joinCode}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(groupOrder.joinCode);
                            toast.success('Join code copied!');
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Copy Group Order Link Button */}
                    <div className="mb-4">
                      <Button
                        onClick={handleCopyGroupOrderLink}
                        variant="outline"
                        className="w-full flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800"
                        size="sm"
                      >
                        <Link className="h-4 w-4" />
                        Copy Group Order Link
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        Share this link with others to join your group order
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      {groupOrder.participants.map((participant) => {
                        const participantSpendingStatus = spendingStatus[participant._id];
                        const hasSpendingLimit = spendingLimitsEnabled && participantSpendingStatus && participantSpendingStatus.status !== 'no_limit';
                        const isExceeded = participantSpendingStatus?.status === 'exceeded_limit';
                        const isApproaching = participantSpendingStatus?.status === 'approaching_limit';
                        
                        return (
                          <div
                            key={participant._id}
                            className={cn(
                              "p-2 rounded border text-xs",
                              participant._id === currentParticipantId ? "bg-primary/5 border-primary/20" : "bg-muted/30",
                              isExceeded ? "border-red-200 bg-red-50" : 
                              isApproaching ? "border-yellow-200 bg-yellow-50" : ""
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{participant.userName}</span>
                                {participant.isLeader && <Badge variant="outline" className="text-xs">Leader</Badge>}
                                {participant._id === currentParticipantId && <Badge variant="secondary" className="text-xs">You</Badge>}
                                {isExceeded && <Badge variant="destructive" className="text-xs">Over Limit</Badge>}
                                {isApproaching && <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Near Limit</Badge>}
                              </div>
                              <div className="text-right">
                                {hasSpendingLimit && (
                                  <div className={cn(
                                    "text-xs",
                                    isExceeded ? "text-red-600" : 
                                    isApproaching ? "text-yellow-600" : "text-muted-foreground"
                                  )}>
                                    Limit: ${participantSpendingStatus.limit?.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {hasSpendingLimit && (
                              <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                  <div 
                                    className={cn(
                                      "h-1 rounded-full transition-all",
                                      isExceeded ? "bg-red-500" : 
                                      isApproaching ? "bg-yellow-500" : "bg-green-500"
                                    )}
                                    style={{ width: `${Math.min(participantSpendingStatus.percentageUsed || 0, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {isGroupLeader && (
                      <div className="flex justify-end mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            toast.info('Order locking feature coming soon');
                          }}
                        >
                          Lock Order
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Place Order button for group leader */}
                  {isGroupLeader && getGroupCartItems().length > 0 && (
                    <div className="mb-4 p-4 border rounded-lg bg-card">
                      <div className="space-y-3">
                        <div className="text-center">
                          <h3 className="text-sm font-medium mb-2">Ready to Place Order?</h3>
                          <p className="text-xs text-muted-foreground mb-3">
                            Total items: {getGroupCartItems().length} • 
                            Total amount: ${getGroupCartItems().reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          onClick={handlePlaceGroupOrder}
                          disabled={isProcessing}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          size="lg"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            `Place Group Order - $${getGroupCartItems().reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}`
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Group order actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (isGroupLeader) {
                          // For group leaders, show settings controls
                          setShowSpendingLimitsSettings(!showSpendingLimitsSettings);
                          setShowPaymentStructureSelector(!showPaymentStructureSelector);
                        } else {
                          // For participants, show group info
                          toast.info(`Group Leader: ${groupOrder.participants.find(p => p.isLeader)?.userName || 'Unknown'}\nJoin Code: ${groupOrder.joinCode}\nPayment: ${selectedPaymentStructure === 'pay_all' ? 'One person pays all' : selectedPaymentStructure === 'equal_split' ? 'Split equally' : selectedPaymentStructure === 'pay_own' ? 'Pay for own orders' : 'Custom split'}`);
                        }
                      }}
                      className="flex-1"
                      size="sm"
                    >
                      {isGroupLeader ? 'Toggle Settings' : 'Group Info'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleLeaveGroupOrder}
                      className="flex-1"
                      size="sm"
                    >
                      Leave Group
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;