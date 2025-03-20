
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '@/context/OrdersContext';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const MyOrders: React.FC = () => {
  const { orders } = useOrders();
  const navigate = useNavigate();

  if (orders.length === 0) {
    return (
      <div className="px-4 py-8 mt-16 flex flex-col items-center">
        <h1 className="text-2xl font-semibold mb-4">My Orders</h1>
        
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">You don't have any orders yet</p>
          
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => navigate('/')}
          >
            Order More Food
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mt-16">
      <h1 className="text-2xl font-semibold mb-6">My Orders</h1>
      
      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium">Order #{order.id.split('-')[1]}</h3>
                  <p className="text-sm text-gray-500">
                    Placed at {format(new Date(order.timestamp), 'h:mm a')}
                  </p>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
                  order.status === 'preparing' 
                    ? 'bg-yellow-100 text-yellow-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {order.status === 'preparing' ? (
                    <>
                      <Clock className="h-3 w-3 mr-1" /> Preparing
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" /> Ready in: 15-20 minutes
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.quantity} x {item.name}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t flex justify-between font-medium">
                <span>Total:</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-center">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => navigate('/')}
        >
          Order More Food
        </Button>
      </div>
    </div>
  );
};

export default MyOrders;
