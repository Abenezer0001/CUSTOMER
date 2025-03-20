
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOrders } from '@/context/OrdersContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';

const OrderConfirmation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getOrderById } = useOrders();
  
  const orderId = location.state?.orderId;
  const order = orderId ? getOrderById(orderId) : null;
  
  if (!order) {
    navigate('/');
    return null;
  }

  return (
    <div className="px-4 py-8 mt-16 flex flex-col items-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      
      <h1 className="text-2xl font-semibold mb-2 text-center">Order Confirmed!</h1>
      
      <p className="text-gray-600 text-center mb-8">
        Your order has been sent to the kitchen. You can track its status on your device.
      </p>
      
      <div className="bg-gray-50 rounded-lg p-6 w-full mb-8">
        <h2 className="text-lg font-medium mb-4">Order Summary</h2>
        
        <div className="mb-4">
          <div className="flex justify-between">
            <span>Total Items:</span>
            <span>{order.items.reduce((total, item) => total + item.quantity, 0)}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Total Amount:</span>
            <span className="font-medium">${order.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex items-center text-yellow-600 mb-2">
          <Clock className="h-5 w-5 mr-2" />
          <span>Estimated Preparation Time: 15-20 minutes</span>
        </div>
      </div>
      
      <div className="flex gap-4 w-full">
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => navigate('/my-orders')}
        >
          View Kitchen Display
        </Button>
        
        <Button
          className="flex-1"
          variant="outline"
          onClick={() => navigate('/')}
        >
          Start New Order
        </Button>
      </div>
    </div>
  );
};

export default OrderConfirmation;
