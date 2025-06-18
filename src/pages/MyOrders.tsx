import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { ClipboardList, Clock, ChevronRight, CheckCircle2, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { getEffectiveToken } from '@/api/authService';
import apiClient from '@/api/apiClient';
import { AuthService } from '@/services/AuthService';
import customerAuthService from '@/api/customerAuthService';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import TableHeader from '@/components/TableHeader';
import { useTableInfo } from '@/context/TableContext';
import { fetchUserOrders, cancelOrder, updatePaymentStatus } from '@/api/orderService';
import { PaymentStatus } from '@/types/Order';
import { toast } from 'sonner';
import { formatDistanceToNow, isToday, parseISO } from 'date-fns';
import { useOrders } from '@/context/OrdersContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  cancellingOrderId: string | null;
  processingPaymentOrderId: string | null;
}> = ({ order, onPayOrder, onCancelOrder, cancellingOrderId, processingPaymentOrderId }) => {
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
          {/* Add Pay Now button for orders with pending payment */}
          {((order.paymentStatus || '').toLowerCase() === 'pending' || !order.paymentStatus) && (
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
  const { isAuthenticated, token, isLoading } = useAuth();
  const { tableId, restaurantName } = useTableInfo();
  const { orders: contextOrders } = useOrders();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [processingPaymentOrderId, setProcessingPaymentOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('today');
  
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

  // Fetch orders on component mount
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading orders with table ID:', tableId);
        console.log('Restaurant name:', restaurantName);
              
        // Always try to fetch orders from API first
        console.log('Fetching orders from API...');
        const response = await apiClient.get('/api/orders/my-orders');
        
          if (response.data) {
            const fetchedOrders = Array.isArray(response.data) ? response.data : [];
            console.log('Fetched orders from API:', fetchedOrders.length);
            setOrders(fetchedOrders);
        } else {
          console.log('No data returned from API, checking context orders');
          // Fall back to context orders if API returns no data
          if (contextOrders && contextOrders.length > 0) {
            console.log('Using orders from context:', contextOrders.length);
            setOrders(contextOrders);
          } else {
            setOrders([]);
        }
        }
        
      } catch (error: any) {
        console.error('Error in loadOrders:', error);
        
        // If API call fails, try to use context orders
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
  }, [tableId, restaurantName, isLoading]); // Removed contextOrders dependency to prevent loops
  
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
        // Extract required data from the order for the checkout session
        const cartItems = orderToPay.items || [];
        const tableId = orderToPay.tableId || '';
        const restaurantId = orderToPay.restaurantId || '';
        
        // Format line items for Stripe - this is the expected format for the backend
        const lineItems = cartItems.map(item => {
          // Calculate the total price including modifiers
          const modifierPrice = item.modifiers 
            ? item.modifiers.reduce((sum, mod) => sum + mod.price, 0) 
            : 0;
          
          const totalItemPrice = (item.price + modifierPrice) * 100; // Convert to cents for Stripe
          
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
        
        console.log('Creating checkout session with:', {
          lineItems: lineItems.length,
          tableId,
          restaurantId,
          orderId: effectiveOrderId
        });
        
        // Create Stripe checkout session using apiClient
        const response = await apiClient.post('/api/payments/create-checkout-session', {
          lineItems,
          tableId,
          restaurantId,
          orderId: effectiveOrderId, // Pass this for reference
          successUrl: `${window.location.origin}/payment/success?order_id=${effectiveOrderId}`,
          cancelUrl: `${window.location.origin}/payment/cancel?order_id=${effectiveOrderId}`
        });

        if (!response.data.success) {
          throw new Error(response.data.error?.message || 'Failed to create payment session');
        }

        // Store the session information
        if (response.data.sessionId) {
          localStorage.setItem('stripeSessionId', response.data.sessionId);
          localStorage.setItem('currentPaymentOrderId', effectiveOrderId);
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

  // Refresh orders
  const refreshOrders = async () => {
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
            onClick={refreshOrders}
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
                    <OrderCard key={order._id} order={order} onPayOrder={handlePayOrder} onCancelOrder={handleCancelOrder} cancellingOrderId={cancellingOrderId} processingPaymentOrderId={processingPaymentOrderId} />
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
                    <OrderCard key={order._id} order={order} onPayOrder={handlePayOrder} onCancelOrder={handleCancelOrder} cancellingOrderId={cancellingOrderId} processingPaymentOrderId={processingPaymentOrderId} />
            ))}
          </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
