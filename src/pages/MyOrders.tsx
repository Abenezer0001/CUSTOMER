import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { ClipboardList, Clock, ChevronRight, CheckCircle2, Loader2, AlertTriangle, RefreshCw, Star } from 'lucide-react';
import { getEffectiveToken } from '@/api/authService';
import apiClient from '@/api/apiClient';
import { AuthService } from '@/services/AuthService';
import customerAuthService from '@/api/customerAuthService';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import TableHeader from '@/components/TableHeader';
import { useTableInfo } from '@/context/TableContext';
import { fetchUserOrders, cancelOrder, updatePaymentStatus } from '@/api/orderService';
import { PaymentStatus } from '@/types/Order';
import { toast } from 'sonner';
import { formatDistanceToNow, isToday, parseISO } from 'date-fns';
import { useOrders } from '@/context/OrdersContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RatingSubmissionModal from '@/components/RatingSubmissionModal';
import * as cashPaymentService from '@/api/cashPaymentService';
import OrderItemRatingModal from '@/components/OrderItemRatingModal';

// Format date to relative time
const formatRelativeTime = (dateString: string) => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch (error) {
    return 'Unknown date';
  }
};

// Status badge component - ensuring correct status mapping
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalizedStatus = status?.toLowerCase();
  
  switch (normalizedStatus) {
    case 'pending':
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Pending</Badge>;
    case 'processing':
    case 'preparing':
      return <Badge className="bg-purple-600 hover:bg-purple-700 text-white">Preparing</Badge>;
    case 'ready':
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Ready</Badge>;
    case 'delivered':
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">Delivered</Badge>;
    case 'completed':
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">Completed</Badge>;
    case 'cancelled':
      return <Badge className="bg-destructive hover:bg-destructive/90 text-white">Cancelled</Badge>;
    default:
      return <Badge className="bg-gray-600 hover:bg-gray-700 text-white">{status || 'Unknown'}</Badge>;
  }
};

const PaymentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status?.toLowerCase()) {
    case 'paid':
      return <Badge className="bg-green-600 hover:bg-green-700">Paid</Badge>;
    case 'pending':
      return <Badge className="bg-amber-500 hover:bg-amber-600">Payment Pending</Badge>;
    case 'failed':
      return <Badge className="bg-destructive hover:bg-destructive/90">Payment Failed</Badge>;
    case 'refunded':
      return <Badge className="bg-blue-600 hover:bg-blue-700">Refunded</Badge>;
    default:
      return null;
  }
};

// Function to categorize orders
const categorizeOrders = (orders: any[]) => {
  const today: any[] = [];
  const past: any[] = [];

  orders.forEach(order => {
    try {
      const orderDate = parseISO(order.createdAt);
      if (isToday(orderDate)) {
        today.push(order);
      } else {
        past.push(order);
      }
    } catch (error) {
      // If date parsing fails, put in past orders
      past.push(order);
    }
  });

  return { today, past };
};

// Order Card Component
const OrderCard: React.FC<{ 
  order: any; 
  onPayOrder: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  onRateOrder: (order: any) => void;
  cancellingOrderId: string | null;
  processingPaymentOrderId: string | null;
  restaurantServiceCharge: { enabled: boolean; percentage: number };
  existingCashPayments?: any[];
}> = ({ order, onPayOrder, onCancelOrder, onRateOrder, cancellingOrderId, processingPaymentOrderId, restaurantServiceCharge, existingCashPayments = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-[#1F1D2B] border border-purple-500/20 rounded-xl p-5 animate-slide-up shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-purple-100">
              Order {order.orderNumber || order._id?.slice(-6) || "Unknown"}
            </h3>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-purple-300/80 flex items-center mt-1">
            <Clock className="h-3.5 w-3.5 mr-1.5 text-purple-400/70" />
            {formatRelativeTime(order.createdAt)}
          </p>
        </div>
        <span className="font-bold text-lg bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
          ${(order.totalAmount || order.total || 0).toFixed(2)}
        </span>
      </div>
      
      <div className="space-y-2.5 mb-4 border-t border-purple-500/10 pt-3">
        {order.items && order.items.slice(0, 3).map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between text-sm group">
            <span className="text-purple-100 group-hover:text-white transition-colors">
              {item.quantity}× {item.name}
            </span>
            <span className="text-purple-300 font-medium">
              ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
            </span>
          </div>
        ))}
        
        {order.items && order.items.length > 3 && (
          <p className="text-sm text-gray-400">
            +{order.items.length - 3} more items
          </p>
        )}
        
        {/* Order breakdown */}
        <div className="space-y-1 mt-2 pt-2 border-t border-purple-500/10">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-gray-300">${(order.subtotal || 0).toFixed(2)}</span>
          </div>
          {((order.service_charge || order.serviceFee) > 0) && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">
                Service Charge {restaurantServiceCharge.enabled ? `(${restaurantServiceCharge.percentage}%)` : ''}
              </span>
              <span className="text-gray-300">${(order.service_charge || order.serviceFee || 0).toFixed(2)}</span>
            </div>
          )}
          {order.tip > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Tip</span>
              <span className="text-gray-300">${(order.tip || 0).toFixed(2)}</span>
            </div>
          )}
        </div>
        
        {/* Payment status as text */}
        {order.paymentStatus && (
          <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-purple-500/10">
            <span className="text-gray-400">Payment Status</span>
            <span className={`font-medium ${order.paymentStatus.toLowerCase() === 'paid' ? 'text-purple-400' : 
              order.paymentStatus.toLowerCase() === 'failed' ? 'text-red-400' : 
              order.paymentStatus.toLowerCase() === 'refunded' ? 'text-blue-400' : 'text-amber-400'}`}>
              {order.paymentStatus}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between border-t border-purple-500/10 pt-3">
        <Button 
          variant="link" 
          className="p-0 h-auto text-purple-400 hover:text-purple-300 transition-colors"
          onClick={() => navigate('/order-confirmation', { state: { orderId: order._id } })}
        >
          <span className="flex items-center">
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </span>
        </Button>
        
        <div className="flex gap-2">
          {/* Show existing cash payment request if exists */}
          {existingCashPayments.length > 0 ? (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-2">
              <div className="flex items-center gap-2 text-orange-400 mb-1">
                <ClipboardList className="h-4 w-4" />
                <span className="text-sm font-medium">Previous Cash Payment Request</span>
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Amount: <span className="text-orange-300 font-medium">${existingCashPayments[0].totalAmount?.toFixed(2)}</span></div>
                <div>Status: <span className="text-orange-300 font-medium">{existingCashPayments[0].status}</span></div>
                <div>Requested: <span className="text-gray-300">{new Date(existingCashPayments[0].createdAt).toLocaleDateString()}, {new Date(existingCashPayments[0].createdAt).toLocaleTimeString()}</span></div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-orange-300">
                <AlertTriangle className="h-3 w-3" />
                <span>A waiter will come to collect this payment shortly</span>
              </div>
            </div>
          ) : (
            /* Add Pay Now button for orders with pending payment and no existing cash payment request */
            ((order.paymentStatus || '').toLowerCase() === 'pending' || !order.paymentStatus) && (
              <Button 
                variant="outline" 
                size="sm"
                className="border-green-600 text-green-600 hover:bg-green-600/10"
                onClick={() => onPayOrder(order._id)}
                disabled={processingPaymentOrderId === order._id}
              >
                {processingPaymentOrderId === order._id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : 'Pay Now'}
              </Button>
            )
          )}
          
          {/* Enhanced Rate button for completed/delivered orders */}
          {(['completed', 'delivered'].includes((order.status || '').toLowerCase()) && 
            (order.paymentStatus || '').toLowerCase() === 'paid') && (
            <Button 
              variant="outline" 
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-none font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm"
              onClick={() => onRateOrder(order)}
            >
              <Star className="h-4 w-4 mr-1 fill-current" />
              Rate Order
            </Button>
          )}
          
          {(order.status || '').toLowerCase() === 'pending' && (
            <Button 
              variant="outline" 
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => onCancelOrder(order._id)}
              disabled={cancellingOrderId === order._id}
            >
              {cancellingOrderId === order._id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : 'Cancel'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const MyOrders: React.FC = () => {
  const { isAuthenticated, token, isLoading, user } = useAuth();
  const [searchParams] = useSearchParams();
  const { tableId, restaurantName } = useTableInfo();
  const { orders: contextOrders, refreshOrders: contextRefreshOrders } = useOrders();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [processingPaymentOrderId, setProcessingPaymentOrderId] = useState<string | null>(null);
  
  // Handle return from Stripe payment
  useEffect(() => {
    const returnFromStripe = searchParams.get('return_from_stripe');
    const orderId = searchParams.get('order_id');
    const tableParam = searchParams.get('table');
    const deviceId = searchParams.get('device_id');
    
    if (returnFromStripe === 'true') {
      console.log('🔄 Detected return from Stripe payment:', { 
        orderId, 
        tableParam, 
        deviceId,
        currentAuth: isAuthenticated 
      });
      
      // Restore table context if provided
      if (tableParam && tableParam !== tableId) {
        localStorage.setItem('currentTableId', tableParam);
        console.log('📍 Restored table context from Stripe return:', tableParam);
      }
      
      // Restore device context if provided
      if (deviceId) {
        localStorage.setItem('device_id', deviceId);
        console.log('📱 Restored device context from Stripe return:', deviceId);
      }
      
      // Show a message about payment cancellation
      toast.error('Payment was cancelled. You can try again when ready.');
      
      // Clean up URL parameters by navigating to clean URL
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('return_from_stripe');
      cleanUrl.searchParams.delete('order_id');
      cleanUrl.searchParams.delete('table');
      cleanUrl.searchParams.delete('device_id');
      
      // Replace current URL with clean version
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }, [searchParams, tableId, isAuthenticated]);
  const [activeTab, setActiveTab] = useState<string>('today');
  const [restaurantServiceCharge, setRestaurantServiceCharge] = useState({ enabled: false, percentage: 0 });
  const [orderCashPayments, setOrderCashPayments] = useState<{[orderId: string]: any[]}>({});
  
  // Rating modal state
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [orderItemRatingModalOpen, setOrderItemRatingModalOpen] = useState(false);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState<any>(null);
  const [selectedMenuItemForRating, setSelectedMenuItemForRating] = useState<any>(null);
  
  // Early authentication check - redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Check for any auth tokens or user data
      const hasToken = token || localStorage.getItem('access_token') || document.cookie.includes('access_token');
      const hasUserData = localStorage.getItem('user');
      
      if (!hasToken && !hasUserData) {
        console.log('User not authenticated, redirecting to login');
        navigate('/login', { 
          state: { 
            returnUrl: `/my-orders${window.location.search}`,
            message: 'Please log in to view your orders'
          } 
        });
        return;
      }
    }
  }, [isAuthenticated, isLoading, token, navigate]);

  // Listen for order-placed events and auto-refresh
  useEffect(() => {
    const handleOrderPlaced = async (event: CustomEvent) => {
      console.log('Order placed event received, updating orders immediately...');
      
      // First, update orders from context immediately
      setOrders(contextOrders);
      
      // Then refresh from API in the background to ensure synchronization
      setTimeout(async () => {
        try {
          await contextRefreshOrders();
          console.log('Orders refreshed successfully after new order placement');
        } catch (error) {
          console.error('Failed to refresh orders after order placement:', error);
        }
      }, 500);
    };

    const handleOrdersUpdated = async (event: CustomEvent) => {
      console.log('Orders updated event received, syncing local state...');
      // Immediately update local state with context orders
      setOrders(contextOrders);
    };

    const handleOrdersRefreshed = async (event: CustomEvent) => {
      console.log('Orders refreshed event received, updating local state...');
      const refreshedOrders = event.detail?.orders || [];
      setOrders(refreshedOrders);
    };

    // Add event listeners for order events
    window.addEventListener('order-placed', handleOrderPlaced as EventListener);
    window.addEventListener('orders-updated', handleOrdersUpdated as EventListener);
    window.addEventListener('orders-refreshed', handleOrdersRefreshed as EventListener);

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener('order-placed', handleOrderPlaced as EventListener);
      window.removeEventListener('orders-updated', handleOrdersUpdated as EventListener);
      window.removeEventListener('orders-refreshed', handleOrdersRefreshed as EventListener);
    };
  }, [contextRefreshOrders, contextOrders]);

  // Fetch restaurant service charge settings
  useEffect(() => {
    const fetchRestaurantServiceCharge = async () => {
      try {
        const restaurantId = localStorage.getItem('restaurantId');
        if (restaurantId) {
          const response = await apiClient.get(`/api/restaurants/${restaurantId}/service-charge`);
          if (response.data.service_charge) {
            setRestaurantServiceCharge(response.data.service_charge);
          }
        }
      } catch (error) {
        console.log('Could not fetch restaurant service charge settings:', error);
        // Keep default values (disabled)
      }
    };

    if (isAuthenticated && !isLoading) {
      fetchRestaurantServiceCharge();
    }
  }, [isAuthenticated, isLoading]);

  // Check for existing cash payment requests for orders
  const checkCashPaymentRequests = async (ordersToCheck: any[]) => {
    if (!tableId) return;
    
    const cashPaymentData: {[orderId: string]: any[]} = {};
    
    // Get user info for cash payment requests
    const user = AuthService.getCurrentUser();
    const userId = user?.id || localStorage.getItem('user_id') || localStorage.getItem('device_id');
    const deviceId = localStorage.getItem('device_id');
    
    for (const order of ordersToCheck) {
      try {
        const response = await cashPaymentService.getCashPaymentRequestsByTable(tableId, userId, deviceId);
        
        if (response.success && response.data) {
          // Filter cash payment requests that match this order's table and are still pending
          const orderCashRequests = Array.isArray(response.data) ? response.data : [response.data];
          const pendingRequests = orderCashRequests.filter((req: any) => 
            req.status === 'PENDING' && req.tableId === tableId
          );
          
          if (pendingRequests.length > 0) {
            cashPaymentData[order._id] = pendingRequests;
          }
        }
      } catch (error) {
        console.log(`No cash payment requests found for order ${order._id}:`, error);
      }
    }
    
    setOrderCashPayments(cashPaymentData);
  };

  // Order card skeleton component
  const OrderCardSkeleton = () => (
    <div className="p-4 rounded-xl bg-[#1F1D2B]/70 border border-purple-500/10 backdrop-blur-sm mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="flex items-center mt-1">
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      
      <div className="space-y-2.5 mb-4 border-t border-purple-500/10 pt-3">
        <div className="flex justify-between text-sm">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between text-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between text-sm">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      
      <div className="flex gap-2 mt-3 pt-3 border-t border-purple-500/10">
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );

  // Check for auth cookies directly
  const hasAuthCookie = () => {
    const cookies = document.cookie.split(';');
    return cookies.some(cookie => 
      cookie.trim().startsWith('auth_token=') || 
      cookie.trim().startsWith('access_token=') ||
      cookie.trim().includes('session') ||
      cookie.trim().includes('sid')
    );
  };

  // Check if we might be authenticated (including HTTP-only cookies)
  const mightBeAuthenticated = () => {
    // Check if we're marked as authenticated in context
    if (isAuthenticated) return true;
    
    // Check for accessible cookies
    if (hasAuthCookie()) return true;
    
    // Check if we have user data indicating previous authentication
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        if (userObj && userObj.id && userObj.email) {
          return true;
        }
      } catch (e) {
        console.error('Error parsing stored user data:', e);
      }
    }
    
    // Check for substantial cookie content that might indicate HTTP-only auth
    const cookieString = document.cookie;
    return cookieString.length > 50;
  };

  // Fetch orders on component mount - prioritize context orders
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading orders with table ID:', tableId);
        console.log('Restaurant name:', restaurantName);
        console.log('Context orders available:', contextOrders.length);
        
        // If we have context orders, use them immediately
        if (contextOrders.length > 0) {
          console.log('Using orders from context immediately:', contextOrders.length);
          setOrders(contextOrders);
          setLoading(false);
          
          // Still refresh from API in background to ensure synchronization
          try {
            await contextRefreshOrders();
          } catch (error) {
            console.log('Background refresh failed, but continuing with context orders');
          }
          return;
        }
        
        // If no context orders, fetch from API
        console.log('No context orders available, fetching from API...');
        const response = await apiClient.get('/api/orders/my-orders');
        
        if (response.data) {
          const fetchedOrders = Array.isArray(response.data) ? response.data : [];
          console.log('Fetched orders from API:', fetchedOrders.length);
          
          // Deduplicate orders by ID to prevent duplicates
          const deduplicatedOrders = fetchedOrders.filter((order, index, self) => {
            const orderId = order._id || order.id;
            return index === self.findIndex(o => (o._id || o.id) === orderId);
          });
          
          console.log('Deduplicated API orders:', { 
            original: fetchedOrders.length, 
            deduplicated: deduplicatedOrders.length 
          });
          
          // Debug order data structure for payment issues
          deduplicatedOrders.forEach((order, index) => {
            console.log(`🔍 Order ${index + 1} debugging:`, {
              id: order.id || order._id,
              orderNumber: order.orderNumber,
              total: order.total,
              subtotal: order.subtotal,
              service_charge: order.service_charge,
              serviceFee: order.serviceFee,
              tip: order.tip,
              paymentStatus: order.paymentStatus,
              status: order.status,
              hasServiceCharge: !!(order.service_charge || order.serviceFee),
              hasTip: !!order.tip
            });
          });
          
          setOrders(deduplicatedOrders);
        } else {
          console.log('No data returned from API');
          setOrders([]);
        }
        
      } catch (error: any) {
        console.error('Error in loadOrders:', error);
        
        // If API call fails, try to use context orders as fallback
        if (contextOrders && contextOrders.length > 0) {
          console.log('Using context orders due to API error');
          setOrders(contextOrders);
        } else {
          setError(`Failed to load orders: ${error.message || 'Unknown error'}`);
          setOrders([]);
        }
      } finally {
        setLoading(false);
      }
    };

    // Only load if not already loading authentication
    if (!isLoading) {
      loadOrders();
    }
  }, [tableId, restaurantName, isLoading]); // Keep contextOrders dependency minimal to prevent loops
  
  // Sync with context orders when they change (with deduplication)
  useEffect(() => {
    if (contextOrders.length > 0 && !loading) {
      console.log('Context orders changed, syncing local state:', contextOrders.length);
      
      // Deduplicate orders by ID
      const deduplicatedOrders = contextOrders.filter((order, index, self) => {
        const orderId = order._id || order.id;
        return index === self.findIndex(o => (o._id || o.id) === orderId);
      });
      
      console.log('Deduplicated orders:', { 
        original: contextOrders.length, 
        deduplicated: deduplicatedOrders.length 
      });
      
      setOrders(deduplicatedOrders);
      
      // Check for existing cash payment requests for each order
      checkCashPaymentRequests(deduplicatedOrders);
    }
  }, [contextOrders, loading]);
  
  // Handle post-login payment processing
  useEffect(() => {
    const processPendingPayment = async () => {
      const pendingOrderId = localStorage.getItem('pendingPaymentOrderId');
      if (pendingOrderId && token) {
        localStorage.removeItem('pendingPaymentOrderId');
        handlePayOrder(pendingOrderId);
      }
    };

    processPendingPayment();
  }, [token]); // Run when token changes

  // Add periodic refresh to ensure new orders appear
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      console.log('Auto-refreshing orders to catch new orders');
      loadOrders();
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);
  
  // We're now always fetching from API, so we don't need to use context orders
  // Remove this effect to prevent showing stale data during loading
  
  // Handle order payment using Stripe Checkout
  const handlePayOrder = async (orderId: string) => {
    try {
      // Check authentication state first
      if (!isAuthenticated && !mightBeAuthenticated()) {
        console.log('Not authenticated, redirecting to login for payment');
        // Save order ID for after login
        localStorage.setItem('pendingPaymentOrderId', orderId);
        
        // Redirect to login
        navigate('/login', { 
          state: { 
            from: '/my-orders',
            orderId 
          } 
        });
        return;
      }
      
      setProcessingPaymentOrderId(orderId);
      console.log('Payment requested for order ID:', orderId);
      
      // Find the order to pay
      const orderToPay = orders.find(order => order.id === orderId || order._id === orderId);
      if (!orderToPay) {
        toast.error('Order not found');
        return;
      }
      
      // Use the _id field if it exists (MongoDB ObjectId) or fall back to id
      const effectiveOrderId = orderToPay._id || orderToPay.id || orderId;
      console.log('Using effective order ID for payment:', effectiveOrderId);

      try {
        // Convert database order items to cart format for payment processing
        let cartItems = (orderToPay.items || []).map(item => {
          // Flatten modifiers from database format to cart format
          const modifiers = [];
          if (item.modifiers && Array.isArray(item.modifiers)) {
            item.modifiers.forEach(modGroup => {
              if (modGroup.selections && Array.isArray(modGroup.selections)) {
                modGroup.selections.forEach(selection => {
                  modifiers.push({
                    name: selection.name,
                    price: selection.price || 0,
                    quantity: selection.quantity || 1
                  });
                });
              }
            });
          }
          
          // Calculate modifier total for debugging
          const modifierTotal = modifiers.reduce((sum, mod) => sum + (mod.price * mod.quantity), 0);
          console.log(`🍕 Item "${item.name}": base price $${item.price}, modifiers: ${modifiers.length}, modifier total: $${modifierTotal}`);
          
          return {
            id: item._id || item.id || `item-${Date.now()}`,
            name: item.name,
            price: item.price || 0,
            quantity: item.quantity || 1,
            subtotal: item.subtotal, // Include subtotal from database for accurate pricing
            modifiers: modifiers,
            specialInstructions: item.specialInstructions || '',
            image: item.image
          };
        });
        
        // Service charge and tip will be added later as separate line items in the Stripe processing section
        
        console.log('🔍 Converted order items to cart format:', {
          originalItems: orderToPay.items?.length || 0,
          convertedItems: cartItems.length,
          cartItems: cartItems.map(item => ({
            name: item.name,
            price: item.price,
            modifiers: item.modifiers?.length || 0,
            modifierPrices: item.modifiers?.map(m => m.price) || []
          }))
        });
        
        const tableId = orderToPay.tableId || '';
        const restaurantId = orderToPay.restaurantId || '';
        
        // Handle group order payment structures
        if (orderToPay.isGroupOrder && orderToPay.groupOrderData) {
          const paymentStructure = orderToPay.groupOrderData.paymentStructure;
          const currentUserId = user?.id || user?._id;
          
          console.log('Processing group order payment with structure:', paymentStructure);
          
          switch (paymentStructure) {
            case 'pay_all':
              // One person pays all - use all items from the group order
              console.log('Payment structure: One person pays all');
              break;
              
            case 'pay_own':
              // Pay for own orders - filter items added by current user
              // For now, calculate the user's portion based on their participation
              const currentParticipant = orderToPay.groupOrderData.participants.find(p => 
                p.userId === currentUserId || p._id === currentUserId
              );
              
              if (currentParticipant && currentParticipant.totalAmount > 0) {
                // Create a line item for the user's own order amount
                cartItems = [{
                  id: 'user-own-order',
                  name: `Your Items from Group Order`,
                  price: currentParticipant.totalAmount,
                  quantity: 1,
                  modifiers: [],
                  specialInstructions: `Pay for your own items (${orderToPay.groupOrderData.joinCode})`
                }];
              } else {
                // Fallback: if no specific amount, don't charge this user
                cartItems = [];
                console.warn('No items found for current user in group order');
              }
              console.log('Payment structure: Pay for own orders, user amount:', cartItems[0]?.price || 0);
              break;
              
            case 'equal_split':
              // Split equally - create a single line item for the user's share
              const totalAmount = orderToPay.total || 0;
              const participantCount = orderToPay.groupOrderData.totalParticipants || 1;
              const userShare = totalAmount / participantCount;
              
              cartItems = [{
                id: 'group-order-share',
                name: `Group Order Share (${participantCount} participants)`,
                price: userShare,
                quantity: 1,
                modifiers: [],
                specialInstructions: ''
              }];
              console.log('Payment structure: Equal split, user share:', userShare);
              break;
              
            case 'custom_split':
              // Custom split - find user's custom amount
              const customSplitParticipant = orderToPay.groupOrderData.participants.find(p => 
                p.userId === currentUserId || p._id === currentUserId
              );
              
              if (customSplitParticipant) {
                cartItems = [{
                  id: 'group-order-custom',
                  name: `Group Order (Custom Split)`,
                  price: customSplitParticipant.totalAmount || 0,
                  quantity: 1,
                  modifiers: [],
                  specialInstructions: ''
                }];
                console.log('Payment structure: Custom split, user amount:', currentParticipant.totalAmount);
              }
              break;
              
            default:
              console.log('Unknown payment structure, using all items');
          }
        }
        
        // Format line items for Stripe - this is the expected format for the backend
        const lineItems = cartItems.map(item => {
          // Use the subtotal from database if available (includes all modifiers), otherwise calculate
          let totalItemPrice;
          if (item.subtotal && typeof item.subtotal === 'number') {
            // Use the pre-calculated subtotal from database (most accurate)
            totalItemPrice = Math.round(item.subtotal * 100); // Convert to cents for Stripe
            console.log(`💰 Using database subtotal for "${item.name}": $${item.subtotal} = ${totalItemPrice} cents`);
          } else {
            // Fallback: Calculate the total price including modifiers
            const modifierPrice = item.modifiers 
              ? item.modifiers.reduce((sum, mod) => sum + mod.price, 0) 
              : 0;
            totalItemPrice = Math.round((item.price + modifierPrice) * 100); // Convert to cents for Stripe
            console.log(`🧮 Calculated total for "${item.name}": base=$${item.price} + modifiers=$${modifierPrice} = ${totalItemPrice} cents`);
          }
          
          // Format description including modifiers
          let description = item.name;
          if (item.modifiers && item.modifiers.length > 0) {
            const modifierNames = item.modifiers.map(mod => mod.name).join(', ');
            description += ` with ${modifierNames}`;
          }
          if (item.specialInstructions) {
            description += `. Note: ${item.specialInstructions}`;
          }
          
          return {
            price_data: {
              currency: 'usd',
              product_data: {
                name: item.name,
                description: description,
                images: item.image ? [item.image] : undefined
              },
              unit_amount: totalItemPrice // Amount in cents
            },
            quantity: item.quantity
          };
        });
        
        
        // Add service charge as a separate line item if present
        const serviceChargeAmount = orderToPay.service_charge || 
                                   orderToPay.serviceFee || 
                                   orderToPay.serviceCharge ||
                                   orderToPay['service-charge'] ||
                                   orderToPay['service_fee'] ||
                                   orderToPay.serviceChargeAmount ||
                                   0;

        // Add tip calculation - moved here to fix ReferenceError
        const tipAmount = orderToPay.tip || orderToPay.tips || orderToPay.tipAmount || 0;
        
        // CRITICAL DEBUG: Log all possible service charge fields
        console.log('🔍 CRITICAL: MyOrders Payment Debug - Full Order Object:', {
          orderId: effectiveOrderId,
          allOrderFields: Object.keys(orderToPay),
          orderToPay: {
            service_charge: orderToPay.service_charge,
            serviceFee: orderToPay.serviceFee,
            serviceCharge: orderToPay.serviceCharge,
            tip: orderToPay.tip,
            tips: orderToPay.tips,
            tipAmount: orderToPay.tipAmount,
            calculatedTipAmount: tipAmount,
            total: orderToPay.total,
            subtotal: orderToPay.subtotal,
            // Check all variations
            'service-charge': orderToPay['service-charge'],
            'service_fee': orderToPay['service_fee'],
            serviceChargeAmount: orderToPay.serviceChargeAmount
          },
          calculatedServiceChargeAmount: serviceChargeAmount,
          calculatedTipAmount: tipAmount,
          lineItemsCount: lineItems.length,
          fullOrderSnapshot: JSON.stringify(orderToPay)
        });
        
        if (serviceChargeAmount > 0) {
          const serviceChargeInCents = Math.round(Number(serviceChargeAmount.toFixed(2)) * 100);
          console.log(`Adding service charge line item: $${serviceChargeAmount} = ${serviceChargeInCents} cents`);
          
          if (serviceChargeInCents > 0 && Number.isInteger(serviceChargeInCents)) {
            lineItems.push({
              price_data: {
                currency: 'usd',
                product_data: {
                  name: 'Service Charge'
                },
                unit_amount: serviceChargeInCents
              },
              quantity: 1
            });
          } else {
            console.warn(`Invalid service charge amount: ${serviceChargeAmount} -> ${serviceChargeInCents} cents`);
          }
        }
        
        // Add tip as a separate line item if present
        if (tipAmount > 0) {
          const tipInCents = Math.round(Number(tipAmount.toFixed(2)) * 100);
          console.log(`Adding tip line item: $${tipAmount} = ${tipInCents} cents`);
          
          if (tipInCents > 0 && Number.isInteger(tipInCents)) {
            lineItems.push({
              price_data: {
                currency: 'usd',
                product_data: {
                  name: 'Tip'
                },
                unit_amount: tipInCents
              },
              quantity: 1
            });
          } else {
            console.warn(`Invalid tip amount: ${tipAmount} -> ${tipInCents} cents`);
          }
        }
        
        // Log all line items before sending to Stripe for debugging
        console.log('Creating checkout session with:', {
          lineItems: lineItems.length,
          tableId,
          restaurantId,
          orderId: effectiveOrderId
        });
        
        console.log('Detailed line items for Stripe:');
        lineItems.forEach((item, index) => {
          console.log(`Line item ${index + 1}:`, {
            name: item.price_data.product_data.name,
            description: item.price_data.product_data.description,
            unit_amount: item.price_data.unit_amount,
            unit_amount_dollars: item.price_data.unit_amount / 100,
            quantity: item.quantity,
            total_cents: item.price_data.unit_amount * item.quantity,
            total_dollars: (item.price_data.unit_amount * item.quantity) / 100
          });
        });
        
        const totalAmountCents = lineItems.reduce((sum, item) => sum + (item.price_data.unit_amount * item.quantity), 0);
        const expectedTotalCents = Math.round((orderToPay.total || orderToPay.totalAmount || 0) * 100);
        
        console.log('Total amount for Stripe session:', {
          totalCents: totalAmountCents,
          totalDollars: totalAmountCents / 100,
          expectedTotal: orderToPay.total || orderToPay.totalAmount,
          expectedTotalCents: expectedTotalCents,
          amountMatch: totalAmountCents === expectedTotalCents
        });
        
        // Enhanced debug logging before validation
        console.log('🔍 ENHANCED DEBUG - Complete Payment Calculation:', {
          orderToPay: {
            total: orderToPay.total,
            totalAmount: orderToPay.totalAmount,
            subtotal: orderToPay.subtotal,
            service_charge: orderToPay.service_charge,
            serviceFee: orderToPay.serviceFee,
            serviceCharge: orderToPay.serviceCharge,
            tip: orderToPay.tip,
            tips: orderToPay.tips,
            tipAmount: orderToPay.tipAmount
          },
          calculatedAmounts: {
            serviceChargeAmount,
            tipAmount,
            totalAmountCents,
            expectedTotalCents,
            difference: totalAmountCents - expectedTotalCents
          },
          lineItemBreakdown: lineItems.map(item => ({
            name: item.price_data.product_data.name,
            unit_amount_cents: item.price_data.unit_amount,
            unit_amount_dollars: item.price_data.unit_amount / 100,
            quantity: item.quantity,
            total_cents: item.price_data.unit_amount * item.quantity,
            total_dollars: (item.price_data.unit_amount * item.quantity) / 100
          }))
        });

        // CRITICAL VALIDATION: Ensure calculated amount matches expected total
        const allowedDifference = 5; // Allow 5 cents difference for rounding issues
        if (Math.abs(totalAmountCents - expectedTotalCents) > allowedDifference) {
          console.error('🚨 PAYMENT AMOUNT MISMATCH DETECTED:', {
            calculatedCents: totalAmountCents,
            calculatedDollars: totalAmountCents / 100,
            expectedCents: expectedTotalCents,
            expectedDollars: expectedTotalCents / 100,
            difference: totalAmountCents - expectedTotalCents,
            allowedDifference,
            lineItems: lineItems.map(item => ({
              name: item.price_data.product_data.name,
              unit_amount: item.price_data.unit_amount,
              quantity: item.quantity,
              total: item.price_data.unit_amount * item.quantity
            })),
            orderBreakdown: {
              subtotal: orderToPay.subtotal,
              serviceCharge: serviceChargeAmount,
              tip: tipAmount,
              manualTotal: (orderToPay.subtotal || 0) + serviceChargeAmount + tipAmount,
              orderTotal: orderToPay.total
            }
          });
          
          // EMERGENCY FIX: Use the line items total instead of order.total if there's a mismatch
          console.warn('⚠️ Using calculated line items total due to mismatch with order.total');
          
          // Don't throw error - proceed with calculated total
          // throw new Error(`Payment amount mismatch: Stripe total ($${(totalAmountCents/100).toFixed(2)}) doesn't match order total ($${((expectedTotalCents)/100).toFixed(2)}). Please contact support.`);
        }
        
        // Store authentication and session info for return from Stripe
        const authToken = localStorage.getItem('auth_token') || localStorage.getItem('access_token');
        const currentUser = localStorage.getItem('user');
        const deviceId = localStorage.getItem('device_id');
        
        // Create comprehensive URLs with all necessary parameters to preserve session
        const baseParams = new URLSearchParams({
          order_id: effectiveOrderId,
          table: tableId || '',
          ...(deviceId && { device_id: deviceId }),
          return_from_stripe: 'true'
        });
        
        const successUrl = `${window.location.origin}/payment/success?${baseParams.toString()}`;
        const cancelUrl = `${window.location.origin}/payment/cancel?${baseParams.toString()}`;
        
        console.log('📍 Payment URLs:', { successUrl, cancelUrl });
        
        // Create Stripe checkout session using apiClient
        const response = await apiClient.post('/api/payments/create-checkout-session', {
          lineItems,
          tableId,
          restaurantId,
          orderId: effectiveOrderId, // Pass this for reference
          successUrl,
          cancelUrl
        });

        if (!response.data.success) {
          throw new Error(response.data.error?.message || 'Failed to create payment session');
        }

        // Store the session information
        if (response.data.sessionId) {
          localStorage.setItem('stripeSessionId', response.data.sessionId);
          localStorage.setItem('currentPaymentOrderId', effectiveOrderId);
          
          // Store group order information for payment completion handling
          if (orderToPay.isGroupOrder && orderToPay.groupOrderData) {
            const groupPaymentInfo = {
              groupOrderId: orderToPay.groupOrderId || effectiveOrderId,
              paymentStructure: orderToPay.groupOrderData.paymentStructure,
              participants: orderToPay.groupOrderData.participants,
              joinCode: orderToPay.groupOrderData.joinCode,
              totalParticipants: orderToPay.groupOrderData.totalParticipants
            };
            localStorage.setItem('currentGroupOrderPayment', JSON.stringify(groupPaymentInfo));
            console.log('Stored group order payment info for completion handling:', groupPaymentInfo);
          }
        }

        // Redirect to Stripe checkout
        if (response.data.url) {
          window.location.href = response.data.url;
        } else {
          throw new Error('No checkout URL received');
        }
      } catch (error) {
        console.error('Payment session creation failed:', error);
        
        if (error.response?.status === 401) {
          toast.error('Please log in again to complete payment');
          navigate('/login', { 
            state: { 
              from: '/my-orders',
              orderId 
            } 
          });
          return;
        }

        // If Stripe is not available, try direct payment update
        // Don't update payment status here - webhook will handle this
        toast.error('Payment service is currently unavailable. Please try again later.');
        // Log for debugging purposes
        console.log('Falling back to manual payment flow is disabled - payment should be processed by Stripe');

      }
    } catch (err) {
      console.error('Error processing payment:', err);
      
      // Check if error is due to authentication
      if (err.response?.status === 401) {
        toast.error('Please log in again to complete payment');
        navigate('/login', { 
          state: { 
            from: '/my-orders',
            orderId 
          } 
        });
        return;
      }
      
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setProcessingPaymentOrderId(null);
    }
  };

  // Handle order cancellation
  const handleCancelOrder = async (orderId: string) => {
    try {
      // Check authentication state first
      if (!isAuthenticated && !mightBeAuthenticated()) {
        console.log('Not authenticated, redirecting to login for cancellation');
        navigate('/login', { 
          state: { 
            returnUrl: '/my-orders',
            orderId 
          } 
        });
        return;
      }
      
      setCancellingOrderId(orderId);
      
      // Use apiClient for cancellation
      await apiClient.post(`/api/orders/${orderId}/cancel`);
      
      // Refresh orders after cancellation using apiClient
      const response = await apiClient.get('/api/orders/my-orders');
      
      // Handle different response formats
      let ordersData = [];
      if (Array.isArray(response.data)) {
        ordersData = response.data;
      } else if (response.data.orders) {
        ordersData = response.data.orders;
      } else if (response.data.data?.orders) {
        ordersData = response.data.data.orders;
      }
      
      setOrders(ordersData);
      toast.success('Order cancelled successfully');
    } catch (err) {
      console.error('Error cancelling order:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        toast.error('Please log in again to cancel the order');
        navigate('/login', { 
          state: { 
            returnUrl: '/my-orders',
            orderId 
          } 
        });
        return;
      }
      
      setError('Failed to cancel order. Please try again.');
      toast.error('Failed to cancel order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Handle rating order
  const handleRateOrder = (order: any) => {
    console.log('Opening rating modal for order:', order);
    
    if (!order.items || order.items.length === 0) {
      toast.error('No items found in this order to rate');
      return;
    }
    
    if (order.items.length === 1) {
      // Single item - use direct rating modal
      setSelectedMenuItemForRating(order.items[0]);
      setSelectedOrderForRating(order);
      setRatingModalOpen(true);
    } else {
      // Multiple items - use order item rating modal
      setSelectedOrderForRating(order);
      setOrderItemRatingModalOpen(true);
    }
  };

  // Handle rating submission
  const handleRatingSubmitted = (rating: any) => {
    console.log('Rating submitted:', rating);
    toast.success('Thank you for your rating!');
    setRatingModalOpen(false);
    setSelectedOrderForRating(null);
    setSelectedMenuItemForRating(null);
  };

  // Handle all ratings submitted for order with multiple items
  const handleAllRatingsSubmitted = () => {
    setOrderItemRatingModalOpen(false);
    setSelectedOrderForRating(null);
  };

  // Refresh orders
  const refreshOrdersLocal = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Refreshing orders...');
      
      // Use apiClient which already handles authentication properly
      const response = await apiClient.get('/api/orders/my-orders');
      
      // Handle different response formats
      let ordersData = [];
      if (Array.isArray(response.data)) {
        ordersData = response.data;
      } else if (response.data.orders) {
        ordersData = response.data.orders;
      } else if (response.data.data?.orders) {
        ordersData = response.data.data.orders;
      }
      
      // Format orders with proper types and defaults
      const formattedOrders = ordersData.map((order: any) => ({
        ...order,
        _id: order._id || order.id || `order-${Math.random().toString(36).substr(2, 9)}`,
        orderNumber: order.orderNumber || `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        totalAmount: order.total || order.totalAmount || 0,
        items: order.items || [],
        status: order.status || 'PENDING',
        paymentStatus: order.paymentStatus || 'PENDING',
        createdAt: order.createdAt || new Date().toISOString(),
        updatedAt: order.updatedAt || new Date().toISOString()
      }));
      
      setOrders(formattedOrders);
      console.log(`Refreshed: ${formattedOrders.length} orders found`);
      
      if (formattedOrders.length > 0) {
        toast.success(`Found ${formattedOrders.length} orders`);
      } else {
        toast.success('Orders refreshed - no orders found');
      }
    } catch (err) {
      console.error('Error refreshing orders:', err);
      
      // Handle authentication errors - only redirect if we get a clear 401
      if (err.response?.status === 401) {
        console.log('Authentication failed during refresh, redirecting to login');
        toast.error('Please log in again to view orders');
        navigate('/login', { state: { returnUrl: '/my-orders' } });
        return;
      }
      
      // For other errors, just show error message without redirecting
      const errorMessage = err.response?.data?.message || 'Failed to refresh orders. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16141F] text-white animate-fade-in pb-20">
        <TableHeader 
          venueName={restaurantName || 'Restaurant'}
          className="bg-[#16141F] text-white"
        />
        <div className="container px-4 py-8 mt-16 animate-fade-in">
          <div className="text-center py-16">
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated after loading is complete, don't render the component (redirect will happen)
  if (!isAuthenticated && !token && !localStorage.getItem('access_token') && !document.cookie.includes('access_token')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#16141F] text-white animate-fade-in pb-20">
      {/* Use the same TableHeader as the menu page */}
      <TableHeader 
        venueName={restaurantName || 'Restaurant'}
        className="bg-[#16141F] text-white"
      />
      
      <div className="container px-4 py-8 mt-16 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <Button 
            variant="outline" 
            className="border-purple-600 text-purple-400 hover:bg-purple-600/10 hover:text-purple-300 transition-colors"
            onClick={refreshOrdersLocal}
            disabled={loading}
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
        
        {loading ? (
          // Show skeleton loaders while loading
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <OrderCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        ) : error ? (
          <div className="bg-destructive/20 border border-destructive text-destructive p-4 rounded-xl mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <p>{typeof error === 'string' ? error : 'Failed to load orders'}</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">You don't have any orders yet</p>
            <Button 
              className="bg-delft-blue hover:bg-delft-blue/90 text-white"
              onClick={() => navigate('/')}
            >
              Browse Menu
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#1F1D2B] border border-purple-500/20">
              <TabsTrigger 
                value="today" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300"
              >
                Today ({categorizeOrders(orders).today.length})
              </TabsTrigger>
              <TabsTrigger 
                value="past" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300"
              >
                Past ({categorizeOrders(orders).past.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="today" className="mt-6">
              {categorizeOrders(orders).today.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-400 mb-4">No orders placed today</p>
                  <Button 
                    className="bg-delft-blue hover:bg-delft-blue/90 text-white"
                    onClick={() => navigate('/')}
                  >
                    Browse Menu
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {categorizeOrders(orders).today.map(order => (
                    <OrderCard key={order._id} order={order} onPayOrder={handlePayOrder} onCancelOrder={handleCancelOrder} onRateOrder={handleRateOrder} cancellingOrderId={cancellingOrderId} processingPaymentOrderId={processingPaymentOrderId} restaurantServiceCharge={restaurantServiceCharge} existingCashPayments={orderCashPayments[order._id] || []} />
                  ))}
                </div>
              )}
            </TabsContent>
                
            <TabsContent value="past" className="mt-6">
              {categorizeOrders(orders).past.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-400 mb-4">No past orders found</p>
                  <Button 
                    className="bg-delft-blue hover:bg-delft-blue/90 text-white"
                    onClick={() => navigate('/')}
                  >
                    Browse Menu
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {categorizeOrders(orders).past.map(order => (
                    <OrderCard key={order._id} order={order} onPayOrder={handlePayOrder} onCancelOrder={handleCancelOrder} onRateOrder={handleRateOrder} cancellingOrderId={cancellingOrderId} processingPaymentOrderId={processingPaymentOrderId} restaurantServiceCharge={restaurantServiceCharge} existingCashPayments={orderCashPayments[order._id] || []} />
            ))}
          </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      
      {/* Single Item Rating Modal */}
      {selectedMenuItemForRating && (
        <RatingSubmissionModal
          isOpen={ratingModalOpen}
          onClose={() => {
            setRatingModalOpen(false);
            setSelectedOrderForRating(null);
            setSelectedMenuItemForRating(null);
          }}
          menuItemId={selectedMenuItemForRating.id || selectedMenuItemForRating.menuItemId || selectedMenuItemForRating._id}
          menuItemName={selectedMenuItemForRating.name}
          menuItemImage={selectedMenuItemForRating.image}
          restaurantId={selectedOrderForRating?.restaurantId || localStorage.getItem('restaurantId') || ''}
          isVerifiedPurchase={true}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}

      {/* Multiple Items Rating Modal */}
      {selectedOrderForRating && (
        <OrderItemRatingModal
          isOpen={orderItemRatingModalOpen}
          onClose={() => {
            setOrderItemRatingModalOpen(false);
            setSelectedOrderForRating(null);
          }}
          order={selectedOrderForRating}
          onAllRatingsSubmitted={handleAllRatingsSubmitted}
        />
      )}
    </div>
  );
};

export default MyOrders;
