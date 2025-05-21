import React, { useState } from 'react';
import { useOrders } from '@/context/OrdersContext';
import { Button } from '@/components/ui/button';
import { CreditCard, Landmark, Banknote, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTableInfo } from '@/context/TableContext';
import { format } from 'date-fns';
import TableHeader from '@/components/TableHeader';
import * as paymentService from '@/api/paymentService';

const Bill: React.FC = () => {
  const { orders, clearOrders } = useOrders();
  const { tableNumber, restaurantName } = useTableInfo();
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  
  // Calculate total from all orders
  const subtotal = orders.reduce((sum, order) => sum + order.subtotal, 0);
  const tax = orders.reduce((sum, order) => sum + order.tax, 0);
  const serviceCharge = subtotal * 0.1; // 10% service charge
  const total = subtotal + tax + serviceCharge;
  
  // Only show the bill if there are orders
  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#16141F] text-white">
        {/* Use the same TableHeader as the menu page */}
        <TableHeader 
          venueName={restaurantName || 'Screen 3'}
          className="bg-[#16141F] text-white"
        />
        
        <div className="px-4 py-8 mt-16">
          <h1 className="text-2xl font-semibold mb-6">Your Bill</h1>
          
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">You don't have any orders to pay for yet</p>
            
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => window.location.href = '/'}
            >
              Browse Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  const handlePayment = async () => {
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    
    setIsPaying(true);
    
    try {
      // Get order IDs from all orders
      // Handle potential type differences between frontend and backend
      const orderId = typeof orders[0]?.id === 'string' ? orders[0]?.id : 
                     typeof orders[0] === 'object' && '_id' in orders[0] ? (orders[0] as any)._id : 
                     null;
      
      // Prepare line items for Stripe
      const lineItems = [];
      
      // Add subtotal items
      orders.forEach(order => {
        order.items.forEach(item => {
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: item.name
              },
              unit_amount: Math.round(item.price * 100) // Convert to cents
            },
            quantity: item.quantity
          });
        });
      });
      
      // Add tax as a separate line item
      if (tax > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Tax'
            },
            unit_amount: Math.round(tax * 100) // Convert to cents
          },
          quantity: 1
        });
      }
      
      // Add service charge as a separate line item
      if (serviceCharge > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Service Charge'
            },
            unit_amount: Math.round(serviceCharge * 100) // Convert to cents
          },
          quantity: 1
        });
      }
      
      // Get table and restaurant information
      const tableId = localStorage.getItem('currentTableId') || 
                      localStorage.getItem('table_id') || 
                      localStorage.getItem('tableId');
      const restaurantId = localStorage.getItem('restaurantId') || 
                           localStorage.getItem('restaurant_id');
      
      // Get the items from all orders to create a single checkout session
      const allItems = [];
      orders.forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            allItems.push({
              id: item.id || (item as any)._id || '',
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              modifiers: item.modifiers || [],
              specialInstructions: item.specialInstructions || ''
            });
          });
        }
      });
      
      // Create a checkout session with Stripe
      const response = await paymentService.createStripeCheckoutSession(
        allItems,
        tableId || '',
        restaurantId || ''
      );
      
      // Redirect to Stripe Checkout
      if (response && response.url) {
        window.location.href = response.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      setIsPaying(false);
    }
  };

  if (paid) {
    return (
      <div className="min-h-screen bg-[#16141F] text-white">
        {/* Use the same TableHeader as the menu page */}
        <TableHeader 
          venueName={restaurantName || 'Screen 3'}
          className="bg-[#16141F] text-white"
        />
        
        <div className="px-4 py-8 mt-16 text-center">
          <div className="w-16 h-16 bg-green-900 rounded-full mx-auto flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-green-400" />
          </div>
          
          <h1 className="text-2xl font-semibold mb-2">Payment Complete!</h1>
          
          <p className="text-gray-400 mb-8">
            Thank you for dining with us. We hope to see you again soon!
          </p>
          
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => window.location.href = '/'}
          >
            Return to Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16141F] text-white">
      {/* Use the same TableHeader as the menu page */}
      <TableHeader 
        venueName={restaurantName || 'Screen 3'}
        className="bg-[#16141F] text-white"
      />
      
      <div className="px-4 py-4 mt-16">
        <h1 className="text-2xl font-semibold mb-6">Your Bill</h1>
      
        <div className="bg-[#262837] border border-[#2D303E] rounded-lg p-4 mb-6">
          <div className="text-center mb-4">
            <h2 className="font-bold text-xl">{restaurantName || 'Screen 3'}</h2>
            <p className="text-sm text-gray-400">Table {tableNumber}</p>
            <p className="text-sm text-gray-400">{format(new Date(), 'MMM d, yyyy h:mm a')}</p>
          </div>
          
          <div className="border-t border-b border-[#2D303E] py-4 my-4">
            {orders.map((order, index) => (
              <div key={index} className="mb-4">
                <h3 className="font-medium text-sm mb-2">Order #{order.id && order.id.includes('-') ? order.id.split('-')[1] : (order.orderNumber || order.id?.substring(0,6) || 'New')}</h3>
                
                {order.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex justify-between text-sm py-1">
                    <span>{item.quantity} x {item.name}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Tax (10%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Service Charge (10%)</span>
              <span>${serviceCharge.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-[#2D303E]">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="font-medium mb-4">Select Payment Method</h2>
          
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={paymentMethod === 'card' ? 'default' : 'outline'}
              className={`h-20 flex flex-col ${
                paymentMethod === 'card' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-[#2D303E] text-white'
              }`}
              onClick={() => setPaymentMethod('card')}
            >
              <CreditCard className="h-6 w-6 mb-2" />
              <span>Card</span>
            </Button>
            
            <Button
              variant={paymentMethod === 'cash' ? 'default' : 'outline'}
              className={`h-20 flex flex-col ${
                paymentMethod === 'cash' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-[#2D303E] text-white'
              }`}
              onClick={() => setPaymentMethod('cash')}
            >
              <Banknote className="h-6 w-6 mb-2" />
              <span>Cash</span>
            </Button>
            
            <Button
              variant={paymentMethod === 'bank' ? 'default' : 'outline'}
              className={`h-20 flex flex-col ${
                paymentMethod === 'bank' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-[#2D303E] text-white'
              }`}
              onClick={() => setPaymentMethod('bank')}
            >
              <Landmark className="h-6 w-6 mb-2" />
              <span>Bank</span>
            </Button>
          </div>
        </div>
        
        <Button
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"
          onClick={handlePayment}
          disabled={isPaying}
        >
          {isPaying ? (
            <>
              <span className="animate-spin mr-2">⭕</span> Processing...
            </>
          ) : (
            <>Pay ${total.toFixed(2)}</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Bill;
