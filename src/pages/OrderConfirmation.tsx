import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOrders } from '@/context/OrdersContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Loader2, ShoppingBag, AlertTriangle, ChevronLeft } from 'lucide-react';
import TableHeader from '@/components/TableHeader';
import { useTableInfo } from '@/context/TableContext';
import { getOrderById } from '@/api/orderService';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return <Badge className="bg-amber-500 hover:bg-amber-600">Pending</Badge>;
    case 'processing':
    case 'preparing':
      return <Badge className="bg-purple-600 hover:bg-purple-700">Preparing</Badge>;
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

// Payment status badge component
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

const OrderConfirmation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addOrder } = useOrders();
  const { isAuthenticated, token } = useAuth();
  const { restaurantName, tableId } = useTableInfo();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const orderId = location.state?.orderId;
  const [pollingActive, setPollingActive] = useState(true);
  
  // Function to get token from all possible sources (cookies, localStorage)
  const getTokenFromAllSources = (): string | null => {
    try {
      // First check cookies
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => 
        cookie.trim().startsWith('auth_token=') || 
        cookie.trim().startsWith('access_token=')
      );
      
      if (tokenCookie) {
        const cookieToken = tokenCookie.split('=')[1].trim();
        return cookieToken;
      }
      
      // Then check localStorage
      const localToken = localStorage.getItem('auth_token');
      if (localToken) {
        return localToken;
      }
    } catch (error) {
      console.error('Error getting token in OrderConfirmation:', error);
    }
    
    return null;
  };
  
  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setError('Order ID is missing. Please check your orders in the My Orders page.');
      setLoading(false);
      return null;
    }
    
    try {
      setLoading(true);
      
      // First check if we have a token either from context or from cookies/localStorage
      let authToken = token;
      
      // If no token in context, check all possible sources (cookies, localStorage)
      if (!authToken) {
        authToken = getTokenFromAllSources();
      }
      
      // Use the API service to get the latest order data if we have a token
      if (authToken) {
        const orderData = await getOrderById(orderId, authToken);
        
        if (!orderData) {
          setError('Order not found. It may have been cancelled or deleted.');
          setLoading(false);
          return null;
        }
        
        setOrder(orderData);
        
        // Add or update the order in the context
        addOrder({
          id: orderData._id,
          items: orderData.items.map((item: any) => ({
            id: item._id || item.menuItem,
            menuItemId: item.menuItem,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: '', // Image may not be available from API
            modifiers: item.modifiers || []
          })),
          subtotal: orderData.subtotal,
          tax: orderData.tax,
          total: orderData.total,
          status: orderData.status.toLowerCase(),
          timestamp: new Date(orderData.createdAt),
          tableNumber: tableId || orderData.tableId
        });
        
        // Check if order is in final state
        const isFinalState = ['completed', 'delivered', 'cancelled'].includes(
          orderData.status.toLowerCase()
        );
        
        if (isFinalState) {
          setPollingActive(false);
        }
        
        return isFinalState;
      } else {
        // If we couldn't find a token anywhere, redirect to login
        navigate('/login', { state: { returnUrl: `/order-confirmation/${orderId}` } });
        return true; // Stop polling
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      setError('Failed to load order details. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [orderId, token, addOrder, navigate, tableId]);
  
  // Only fetch order data once on component mount
  useEffect(() => {
    // Create reference to track component mounted state
    let isMounted = true;
    
    const loadOrderOnce = async () => {
      // Check if we need to attempt auth refresh before starting
      if (!token && getTokenFromAllSources()) {
        console.log('Found token in cookies but not in context');
      }
      
      // Only make one API call to get initial order data
      await fetchOrder();
      
      // After getting order, check if polling should continue based on order status
      if (isMounted && order && ['completed', 'delivered', 'cancelled'].includes(order.status?.toLowerCase())) {
        setPollingActive(false);
      }
    };
    
    // Only run initial fetch if we have an order ID
    if (orderId) {
      loadOrderOnce();
    } else {
      setError('Order ID is missing. Please check your orders in the My Orders page.');
      setLoading(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [orderId]); // Only depend on orderId to prevent re-fetching
  
  // Set up controlled polling with a fixed refresh rate
  useEffect(() => {
    // Don't set up polling if it's disabled or no order ID
    if (!pollingActive || !orderId) return;
    
    let isMounted = true;
    
    // Create polling interval - refresh every 60 seconds (reduced from 30s)
    const pollInterval = setInterval(async () => {
      if (isMounted) {
        // Get latest order status
        const isFinalState = await fetchOrder();
        if (isFinalState) {
          clearInterval(pollInterval);
        }
      }
    }, 60000); // 60 seconds
    
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [fetchOrder, orderId, pollingActive]);
  
  // Helper functions for order display
  const getOrderStatusTitle = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'Order Complete!';
      case 'cancelled':
        return 'Order Cancelled';
      case 'ready':
        return 'Order Ready!';
      case 'processing':
      case 'preparing':
        return 'Order is Being Prepared';
      case 'pending':
        return 'Order Received';
      default:
        return 'Order Status';
    }
  };

  const getOrderStatusDescription = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'Your order has been delivered. Enjoy your meal!';
      case 'cancelled':
        return 'This order has been cancelled.';
      case 'ready':
        return 'Your order is ready for pickup or delivery.';
      case 'processing':
      case 'preparing':
        return 'Your order is being prepared in the kitchen.';
      case 'pending':
        return 'Your order is being processed. Check back for updates.';
      default:
        return 'Check back for updates on your order status.';
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#16141F] text-white">
        <TableHeader 
          venueName={restaurantName || 'Restaurant'}
          className="bg-[#16141F] text-white"
        />
        <div className="flex justify-center items-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#16141F] text-white">
        <TableHeader 
          venueName={restaurantName || 'Restaurant'}
          className="bg-[#16141F] text-white"
        />
        <div className="container max-w-2xl mx-auto px-4 py-8 mt-16">
          <div className="bg-destructive/20 border border-destructive text-destructive p-4 rounded-xl mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <p>{error}</p>
            </div>
          </div>
          <div className="flex justify-center mt-6">
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => navigate('/')}
            >
              Return to Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!order) return null;

  // Format relative time
  const orderTime = formatDistanceToNow(
    new Date(order.createdAt || new Date()),
    { addSuffix: true }
  );

  return (
    <div className="min-h-screen bg-[#16141F] text-white animate-fade-in pb-20">
      <TableHeader 
        venueName={restaurantName || 'Restaurant'}
        className="bg-[#16141F] text-white"
      />
      
      <div className="container max-w-2xl mx-auto px-4 py-8 mt-16 animate-fade-in">
        <div className="relative mb-6">
          <Button 
            variant="outline" 
            className="absolute -top-5 -left-2 border-purple-500 text-purple-400 hover:bg-purple-500/10" 
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-purple-600/20 flex items-center justify-center mb-4">
            {order.status?.toLowerCase() === 'completed' || order.status?.toLowerCase() === 'delivered' ? (
              <CheckCircle className="h-12 w-12 text-purple-500" />
            ) : order.status?.toLowerCase() === 'cancelled' ? (
              <AlertTriangle className="h-12 w-12 text-destructive" />
            ) : (
              <Clock className="h-12 w-12 text-purple-500" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold mb-2 text-white">
            {getOrderStatusTitle(order.status || 'pending')}
          </h1>
          
          <p className="text-purple-300/80 mb-4">
            {getOrderStatusDescription(order.status || 'pending')}
          </p>
          
          <div className="flex items-center gap-2 text-sm mb-1">
            <span className="font-medium text-white">Order #</span>
            <span className="text-white">{order._id?.slice(-6) || 'Unknown'}</span>
            <span className="text-purple-400/70">•</span>
            <span className="text-purple-400/70">
              {orderTime}
            </span>
          </div>
        </div>
        
        <div className="bg-[#1F1D2B] border border-purple-500/20 rounded-xl p-5 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-white">Order Details</h2>
          
          <div className="space-y-4">
            {order.items && order.items.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-start">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-purple-600/20 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <ShoppingBag className="h-3 w-3 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-sm text-purple-300/80">Quantity: {item.quantity}</p>
                    <p className="text-xs text-purple-400/70 mt-1">
                      Order Status: <span className="text-purple-300">{order.status}</span>
                    </p>
                    {item.specialInstructions && (
                      <p className="text-sm text-purple-300/80 italic mt-1">
                        "{item.specialInstructions}"
                      </p>
                    )}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="text-sm text-purple-300/80 mt-1">
                        {item.modifiers.map((mod: any, idx: number) => (
                          <p key={idx}>• {mod.name}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="font-medium text-white">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          
          <div className="border-t border-purple-500/10 my-4 pt-4">
            <div className="flex justify-between text-sm py-1">
              <span className="text-purple-300/80">Subtotal</span>
              <span className="text-white">${order.subtotal?.toFixed(2) || '0.00'}</span>
            </div>
            
            <div className="flex justify-between text-sm py-1">
              <span className="text-purple-300/80">Tax</span>
              <span className="text-white">${order.tax?.toFixed(2) || '0.00'}</span>
            </div>
            
            <div className="flex justify-between font-medium py-1">
              <span className="text-white">Total</span>
              <span className="text-white">${order.total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          
          <div className="flex items-center text-purple-400 mt-4 bg-purple-600/10 p-3 rounded-md text-sm">
            <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Estimated Preparation Time: 15-20 minutes</span>
          </div>
        </div>
        
        <div className="flex justify-center w-full mt-6">
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white w-full max-w-xs"
            onClick={() => {
              // Check all possible sources of table ID
              const storedTableId = localStorage.getItem('currentTableId') || 
                                  localStorage.getItem('table_id') || 
                                  localStorage.getItem('tableId');
              
              if (storedTableId) {
                navigate(`/?table=${storedTableId}`);
              } else {
                navigate('/');
              }
            }}
          >
            Start New Order
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
