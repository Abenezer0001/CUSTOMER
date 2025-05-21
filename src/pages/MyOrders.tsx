import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { ClipboardList, Clock, ChevronRight, CheckCircle2, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import TableHeader from '@/components/TableHeader';
import { useTableInfo } from '@/context/TableContext';
import { fetchUserOrders, cancelOrder, updatePaymentStatus } from '@/api/orderService';
import { PaymentStatus } from '@/types/Order';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useOrders } from '@/context/OrdersContext';

// Format date to relative time
const formatRelativeTime = (dateString: string) => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch (error) {
    return 'Unknown date';
  }
};

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return <Badge className="bg-amber-500 hover:bg-amber-600">Pending</Badge>;
    case 'processing':
    case 'preparing':
      return <Badge className="bg-delft-blue hover:bg-delft-blue/90">Preparing</Badge>;
    case 'ready':
      return <Badge className="bg-blue-600 hover:bg-blue-700">Ready</Badge>;
    case 'delivered':
      return <Badge className="bg-green-600 hover:bg-green-700">Delivered</Badge>;
    case 'completed':
      return <Badge className="bg-green-600 hover:bg-green-700">Completed</Badge>;
    case 'cancelled':
      return <Badge className="bg-destructive hover:bg-destructive/90">Cancelled</Badge>;
    default:
      return <Badge className="bg-gray-600 hover:bg-gray-700">{status}</Badge>;
  }
};

const MyOrders: React.FC = () => {
  const { isAuthenticated, token } = useAuth();
  const { tableId, restaurantName } = useTableInfo();
  const { orders: contextOrders } = useOrders();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [processingPaymentOrderId, setProcessingPaymentOrderId] = useState<string | null>(null);
  
  // Directly use orders from context when available
  useEffect(() => {
    if (contextOrders && contextOrders.length > 0) {
      console.log(`Using ${contextOrders.length} orders from context`);
      setOrders(contextOrders);
      setLoading(false);
      return;
    }
    
    // Fetch orders on component mount if not available in context
    const loadOrders = async () => {
      try {
        // Check if we have a token, even for guest users
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.log('No token found, redirecting to login');
          navigate('/login', { state: { returnUrl: '/my-orders' } });
          setLoading(false);
          return;
        }
        
        setLoading(true);
        setError(null);
        
        // Get tableId from URL query params if available
        const params = new URLSearchParams(location.search);
        const tableIdFromUrl = params.get('table');
        // No need to set table ID here as it's handled by the TableContext
        
        // Fetch orders using the token (works for both registered and guest users)
        const response = await fetchUserOrders();
        
        if (response) {
          // Check if response is an array (direct API response) or has an orders property
          const ordersData = Array.isArray(response) ? response : (response.orders || []);
          console.log(`Processing ${ordersData.length} orders from API response`);
          
          const formattedOrders = ordersData.map((order: any) => ({
            ...order,
            totalAmount: order.total || 0,
            items: order.items || [],
            status: order.status || 'PENDING',
            createdAt: new Date(order.createdAt || Date.now()).toLocaleString()
          }));
          
          setOrders(formattedOrders);
          setLoading(false);
        } else {
          console.error('Invalid response format:', response);
          setError(new Error('Failed to fetch orders'));
        }
      } catch (err) {
        console.error('Error loading orders:', err);
        setError(err instanceof Error ? err : new Error('Failed to load orders'));
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [navigate, location.search]);
  
  // Use orders from context if available
  useEffect(() => {
    if (contextOrders && contextOrders.length > 0) {
      console.log(`Using ${contextOrders.length} orders from context`);
      setOrders(contextOrders);
      setLoading(false);
    }
  }, [contextOrders]);
  
  // Handle order payment using Stripe Checkout
  const handlePayOrder = async (orderId: string) => {
    try {
      if (!token) {
        toast.error('Authentication required to pay for order');
        return;
      }
      
      setProcessingPaymentOrderId(orderId);
      
      // Find the order to pay for
      const orderToPay = orders.find(order => order._id === orderId);
      if (!orderToPay) {
        toast.error('Order not found');
        return;
      }

      try {
        // Try to create a Stripe checkout session
        // Using dynamic import to avoid dependency issues if Stripe service is not available
        const { createStripeCheckout } = await import('@/api/stripeService');
        const checkoutUrl = await createStripeCheckout(orderId, orderToPay);
        
        // Redirect to Stripe checkout
        window.location.href = checkoutUrl;
      } catch (stripeError) {
        console.warn('Stripe checkout failed, falling back to direct payment:', stripeError);
        
        // Fallback: Update payment status directly
        const { updateOrderPaymentStatus } = await import('@/api/stripeService');
        await updateOrderPaymentStatus(orderId, PaymentStatus.PAID);
        
        // Refresh orders after payment
        const response = await fetchUserOrders();
        if (response) {
          // Check if response is an array (direct API response) or has an orders property
          const ordersData = Array.isArray(response) ? response : (response.orders || []);
          setOrders(ordersData);
          toast.success('Payment successful!');
        }
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setProcessingPaymentOrderId(null);
    }
  };

  // Handle order cancellation
  const handleCancelOrder = async (orderId: string) => {
    try {
      if (!token) {
        toast.error('Authentication required to cancel order');
        return;
      }
      
      setCancellingOrderId(orderId);
      await cancelOrder(orderId);
      
      // Refresh orders after cancellation
      const response = await fetchUserOrders();
      if (response) {
        // Check if response is an array (direct API response) or has an orders property
        const ordersData = Array.isArray(response) ? response : (response.orders || []);
        setOrders(ordersData);
        toast.success('Order cancelled successfully');
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      setError('Failed to cancel order. Please try again.');
      toast.error('Failed to cancel order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Refresh orders
  const refreshOrders = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await fetchUserOrders();
      if (response) {
        // Check if response is an array (direct API response) or has an orders property
        const ordersData = Array.isArray(response) ? response : (response.orders || []);
        setOrders(ordersData);
        setError(null);
      }
    } catch (err) {
      console.error('Error refreshing orders:', err);
      setError('Failed to refresh orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-raisin-black text-white animate-fade-in pb-20">
      {/* Use the same TableHeader as the menu page */}
      <TableHeader 
        venueName={restaurantName || 'Restaurant'}
        className="bg-raisin-black text-white"
      />
      
      <div className="container px-4 py-8 mt-16 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <Button 
            variant="outline" 
            className="border-delft-blue text-delft-blue hover:bg-delft-blue/10"
            onClick={refreshOrders}
            disabled={loading}
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>


        
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-delft-blue" />
          </div>
        ) : error ? (
          <div className="bg-destructive/20 border border-destructive text-destructive p-4 rounded-xl mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <p>{error?.message || error}</p>
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
          <div className="space-y-4">
            {orders.map(order => (
              <div 
                key={order._id} 
                className="bg-night border border-delft-blue rounded-lg p-4 animate-slide-up"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">Order #{order._id ? order._id.slice(-6) : order.orderNumber || "Unknown"}</h3>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-gray-400">
                      {formatRelativeTime(order.createdAt)}
                    </p>
                  </div>
                  <span className="font-bold">${(order.totalAmount || 0).toFixed(2)}</span>
                </div>
                
                <div className="space-y-2 mb-3">
                  {order.items && order.items.slice(0, 3).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity}× {item.name}</span>
                      <span>${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                  
                  {order.items && order.items.length > 3 && (
                    <p className="text-sm text-gray-400">
                      +{order.items.length - 3} more items
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between border-t border-delft-blue pt-3">
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-delft-blue"
                    onClick={() => navigate('/order-confirmation', { state: { orderId: order._id } })}
                  >
                    <span className="flex items-center">
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </span>
                  </Button>
                  
                  <div className="flex gap-2">
                    {/* Add Pay Now button for orders with pending payment */}
                    {(order.paymentStatus?.toLowerCase() === 'pending' || !order.paymentStatus) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-green-600 text-green-600 hover:bg-green-600/10"
                        onClick={() => handlePayOrder(order._id)}
                        disabled={processingPaymentOrderId === order._id}
                      >
                        {processingPaymentOrderId === order._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : 'Pay Now'}
                      </Button>
                    )}
                    
                    {order.status.toLowerCase() === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancelOrder(order._id)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
