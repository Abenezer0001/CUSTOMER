import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOrders } from '@/context/OrdersContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Loader2, ShoppingBag, AlertTriangle } from 'lucide-react';
import TableHeader from '@/components/TableHeader';
import { useTableInfo } from '@/context/TableContext';
import { getOrderById } from '@/api/orderService';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

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
  
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError('Order ID is missing. Please check your orders in the My Orders page.');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Use the API service to get the latest order data
        if (isAuthenticated && token) {
          const orderData = await getOrderById(orderId, token);
          if (!orderData) {
            setError('Order not found. It may have been cancelled or deleted.');
            setLoading(false);
            return;
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
        } else {
          // If not authenticated, redirect
          navigate('/login', { state: { returnUrl: `/order-confirmation/${orderId}` } });
          return;
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
        setError('Failed to load order details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
  }, [orderId, addOrder, navigate, isAuthenticated, token, tableId]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-raisin-black text-white flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-delft-blue" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-raisin-black text-white">
        <TableHeader 
          venueName={restaurantName || 'Restaurant'}
          className="bg-raisin-black text-white"
        />
        
        <div className="px-4 py-8 mt-16 flex flex-col items-center">
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-semibold mb-2 text-center">Order Error</h1>
          
          <p className="text-gray-400 text-center mb-8">
            {error}
          </p>
          
          <div className="flex gap-4 w-full">
            <Button
              className="flex-1 bg-delft-blue hover:bg-delft-blue/90 text-white"
              onClick={() => navigate('/my-orders')}
            >
              View My Orders
            </Button>
            
            <Button
              className="flex-1 border-delft-blue text-white"
              variant="outline"
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
    <div className="min-h-screen bg-raisin-black text-white animate-fade-in pb-20">
      <TableHeader 
        venueName={restaurantName || 'Restaurant'}
        className="bg-raisin-black text-white"
      />
      
      <div className="px-4 py-8 mt-16 flex flex-col items-center">
        <div className="w-16 h-16 bg-delft-blue/20 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-10 w-10 text-delft-blue" />
        </div>
        
        <h1 className="text-2xl font-semibold mb-2 text-center">Order Confirmed!</h1>
        
        <p className="text-gray-400 text-center mb-4">
          Your order has been sent to the kitchen. You can track its status on your device.
        </p>
        
        <div className="text-center mb-6 flex items-center justify-center gap-2">
          <p className="text-sm text-gray-400">Order #{order._id?.slice(-6)}</p>
          <StatusBadge status={order.status || 'pending'} />
        </div>
        
        <p className="text-sm text-gray-400 mb-6">{orderTime}</p>
        
        <Card className="w-full mb-6 bg-night border border-delft-blue">
          <CardContent className="pt-6">
            <h2 className="text-lg font-medium mb-4 text-white">Order Details</h2>
            
            <div className="space-y-4">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-start">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-delft-blue/10 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <ShoppingBag className="h-3 w-3 text-delft-blue" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-sm text-gray-400">Quantity: {item.quantity}</p>
                      {item.specialInstructions && (
                        <p className="text-sm text-gray-400 italic mt-1">
                          "{item.specialInstructions}"
                        </p>
                      )}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-sm text-gray-400 mt-1">
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
            
            <div className="border-t border-delft-blue/30 my-4 pt-4">
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">${order.subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-400">Tax</span>
                <span className="text-white">${order.tax.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between font-medium py-1">
                <span className="text-white">Total</span>
                <span className="text-white">${order.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex items-center text-delft-blue mt-4 bg-delft-blue/10 p-3 rounded-md">
              <Clock className="h-5 w-5 mr-2" />
              <span>Estimated Preparation Time: 15-20 minutes</span>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex gap-4 w-full">
          <Button
            className="flex-1 bg-delft-blue hover:bg-delft-blue/90 text-white"
            onClick={() => navigate('/my-orders')}
          >
            View My Orders
          </Button>
          
          <Button
            className="flex-1 border-delft-blue text-white"
            variant="outline"
            onClick={() => navigate('/')}
          >
            Start New Order
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
