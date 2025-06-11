import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrdersContext';
import { useTableInfo } from '@/context/TableContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { createOrder, getRestaurantIdFromTableId } from '@/api/orderService';
import { createStripeCheckoutSession } from '@/api/paymentService';
import { OrderStatus, PaymentStatus } from '@/types';

const Checkout: React.FC = () => {
  const { cartItems, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { tableId, restaurantName } = useTableInfo();
  const { isAuthenticated, token, guestLogin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Calculate subtotal from cart items
  const subtotal = cartItems.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  // Function to handle checkout with Stripe
  const handleStripeCheckout = async () => {
    if (!tableId) {
      toast.error('Table information is missing. Please scan a table QR code.');
      navigate('/scan-table');
      return;
    }
    
    // Check authentication status
    if (!isAuthenticated || !token) {
      // First check if we have a stored token
      const storedToken = localStorage.getItem('auth_token');
      
      if (storedToken) {
        console.log('Found stored token, trying to use it for checkout...');
        // Token exists, we'll try to use it directly in the order request
        // No need to do anything here, the token will be used in the API call
      } else {
        // Try guest login if no stored token
        const guestLoginSuccess = await guestLogin(tableId);
        
        if (!guestLoginSuccess) {
          toast.error('Please log in to complete your order');
          navigate('/login', { state: { returnUrl: '/checkout' } });
          return;
        }
        
        // Continue with checkout after successful guest login
        toast.success('Continuing as guest');
      }
    } else {
      // User is authenticated
      console.log('User is authenticated as:', user?.role);
      toast.success(`Proceeding with checkout as ${user?.role === 'customer' ? 'customer' : 'guest'}`);
    }
    
    setIsProcessing(true);
    
    try {
      // Get restaurant ID from table ID using API call
      let restaurantId: string;
      try {
        restaurantId = await getRestaurantIdFromTableId(tableId);
        console.log('Fetched restaurant ID from table API:', restaurantId);
      } catch (error) {
        console.error('Failed to get restaurant ID from table:', error);
        throw new Error('Unable to determine restaurant ID from table: ' + tableId);
      }
      
      // Create order without passing token (it will be retrieved from storage)
      const orderResponse = await createOrder(
        cartItems,
        tableId,
        restaurantId
      );
      
      if (!orderResponse || !orderResponse._id) {
        throw new Error('Failed to create order');
      }
      
      // Add the order to local context
      addOrder({
        id: orderResponse._id,
        orderNumber: orderResponse.orderNumber || `ORD-${Date.now()}`,
        items: cartItems,
        subtotal,
        tax,
        serviceFee: orderResponse.serviceFee || 0,
        tip: orderResponse.tip || 0,
        total,
        status: OrderStatus.PENDING,
        paymentStatus: orderResponse.paymentStatus || PaymentStatus.PENDING,
        timestamp: new Date(orderResponse.createdAt),
        tableId: tableId
      });
      
      // Create Stripe checkout session
      const stripeSession = await createStripeCheckoutSession(
        cartItems,
        tableId,
        restaurantId
      );
      
      if (!stripeSession || !stripeSession.url) {
        throw new Error('Failed to create payment session');
      }
      
      // Store order ID in localStorage for retrieval after payment
      localStorage.setItem('pending_order_id', orderResponse._id);
      
      // Clear the cart
      clearCart();
      
      // Redirect to Stripe checkout
      window.location.href = stripeSession.url;
      
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process your order');
      setIsProcessing(false);
    }
  };

  return (
    <div className="px-4 py-4 mt-16">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-6 pl-0"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <h1 className="text-2xl font-semibold mb-6">Checkout</h1>
      
      <div className="mb-8 bg-night rounded-lg border border-delft-blue p-4">
        <h2 className="font-medium mb-4 text-white">Order Summary</h2>
        
        {cartItems.map((item) => (
          <div key={item.id} className="flex justify-between py-2 text-sm text-white">
            <div>
              <span>{item.quantity} x {item.name}</span>
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="text-xs text-gray-400 ml-4">
                  {/* Check for cookingPreference property safely */}
                  {(item as any).cookingPreference && <div>• {(item as any).cookingPreference}</div>}
                  {item.modifiers.map(mod => (
                    <div key={mod.id}>• {mod.name}</div>
                  ))}
                </div>
              )}
            </div>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        
        <div className="border-t border-delft-blue/30 my-3"></div>
        
        <div className="flex justify-between text-sm py-2 text-white">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-sm py-2 text-white">
          <span>Tax (10%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between font-medium py-2 text-white">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="bg-night rounded-lg border border-delft-blue p-4 mb-8">
        <h2 className="font-medium mb-4 text-white">Secure Payment</h2>
        
        <p className="text-gray-400 text-sm mb-4">
          Your payment will be processed securely through Stripe. You'll be redirected to complete your payment.
        </p>
        
        <Button 
          onClick={handleStripeCheckout}
          className="w-full bg-delft-blue hover:bg-delft-blue/90 text-white h-12"
          disabled={isProcessing || cartItems.length === 0}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" /> Pay ${total.toFixed(2)}
            </>
          )}
        </Button>
        
        <div className="mt-4 flex items-center justify-center">
          <img 
            src="https://stripe.com/img/v3/home/secure-badge.svg" 
            alt="Secure payments by Stripe" 
            className="h-8"
          />
        </div>
      </div>
      
      <div className="text-center text-xs text-gray-400 mb-6">
        By proceeding with your payment, you agree to our Terms of Service and Privacy Policy.
      </div>
    </div>
  );
};

export default Checkout;
