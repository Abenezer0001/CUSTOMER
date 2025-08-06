import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrdersContext';
import { useTableInfo } from '@/context/TableContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { createOrder, getRestaurantIdFromTableId, OrderData, OrderType } from '@/api/orderService';
import { createStripeCheckoutSession } from '@/api/paymentService';
import { OrderStatus, PaymentStatus } from '@/types';
import apiClient from '@/api/apiClient';

const Checkout: React.FC = () => {
  const { cartItems, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { tableId, restaurantName } = useTableInfo();
  const { isAuthenticated, token, guestLogin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Service charge state
  const [venueServiceCharge, setVenueServiceCharge] = useState({
    enabled: false,
    type: 'percentage' as 'percentage' | 'flat',
    value: 0
  });
  const [tipAmount, setTipAmount] = useState(0);
  
  // Calculate subtotal from cart items including modifiers
  const subtotal = cartItems.reduce((total, item) => {
    const basePrice = item.price * item.quantity;
    const modifiersPrice = item.modifiers 
      ? item.modifiers.reduce((modSum, mod) => modSum + mod.price, 0) * item.quantity
      : 0;
    return total + basePrice + modifiersPrice;
  }, 0);
  
  // Calculate service charge based on venue settings
  const serviceCharge = React.useMemo(() => {
    if (!venueServiceCharge.enabled) return 0;
    
    if (venueServiceCharge.type === 'percentage') {
      return Math.round((subtotal * venueServiceCharge.value) / 100 * 100) / 100;
    } else {
      return venueServiceCharge.value;
    }
  }, [venueServiceCharge, subtotal]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  const tax = 0; // No tax applied, only service charge (following CartDrawer pattern)
  const total = subtotal + tax + serviceCharge + tipAmount;

  // Fetch venue service charge settings when component loads
  useEffect(() => {
    const fetchVenueServiceCharge = async () => {
      try {
        if (!tableId) return;
        
        // Get table data to find venueId
        const tableResponse = await apiClient.get(`/api/restaurant-service/tables/${tableId}`);
        
        // Extract venueId - handle both string ID and populated object
        let venueId = null;
        if (typeof tableResponse.data.venueId === 'string') {
          venueId = tableResponse.data.venueId;
        } else if (typeof tableResponse.data.venueId === 'object' && tableResponse.data.venueId?._id) {
          venueId = tableResponse.data.venueId._id;
        }
        
        if (!venueId) {
          console.log('No venueId found in table data');
          return;
        }
        
        // If venue data is already populated, use it directly
        if (typeof tableResponse.data.venueId === 'object' && tableResponse.data.venueId?.serviceCharge) {
          setVenueServiceCharge(tableResponse.data.venueId.serviceCharge);
          return;
        }
        
        // Fetch venue data separately if not populated
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/venue-service/venues/${venueId}`);
        if (response.ok) {
          const venueData = await response.json();
          if (venueData.serviceCharge) {
            setVenueServiceCharge(venueData.serviceCharge);
          }
        }
      } catch (error) {
        console.error('Error fetching venue service charge:', error);
      }
    };

    fetchVenueServiceCharge();
  }, [tableId]);

  // Function to handle checkout with Stripe
  const handleStripeCheckout = async () => {
    if (!tableId) {
      toast.error('Table information is missing. Please scan a table QR code.');
      navigate('/scan-table');
      return;
    }
    
    if (cartItems.length === 0) {
      toast.error('Your cart is empty. Please add items before checking out.');
      return;
    }
    
    if (total <= 0) {
      toast.error('Invalid order total. Please refresh and try again.');
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
      
      // Format order items
      const formattedItems = cartItems.map(item => ({
        menuItem: item.menuItemId || item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
        specialInstructions: item.specialInstructions || '',
        modifiers: item.modifiers?.map(mod => ({
          name: mod.name,
          price: mod.price
        })) || []
      }));

      // Create custom order data with tip and service charge
      const orderData: OrderData = {
        restaurantId,
        tableId,
        items: formattedItems,
        subtotal,
        tax,
        serviceFee: serviceCharge,
        tip: tipAmount,
        total,
        orderType: OrderType.DINE_IN,
        specialInstructions: ''
      };

      // Create order with custom data that includes tip and service charge
      const orderResponse = await createOrder(
        cartItems,
        tableId,
        restaurantId,
        orderData
      );
      
      if (!orderResponse || !orderResponse._id) {
        throw new Error('Failed to create order');
      }
      
      // Add the order to local context with all necessary fields
      addOrder({
        id: orderResponse._id,
        _id: orderResponse._id, // Also include _id for consistency
        orderNumber: orderResponse.orderNumber || `ORD-${Date.now()}`,
        items: cartItems,
        subtotal,
        tax,
        serviceFee: serviceCharge,
        tip: tipAmount,
        total,
        status: OrderStatus.PENDING,
        paymentStatus: orderResponse.paymentStatus || PaymentStatus.PENDING,
        timestamp: new Date(orderResponse.createdAt),
        createdAt: orderResponse.createdAt, // Include createdAt for filtering
        tableId: tableId,
        userId: orderResponse.userId // Include userId for filtering
      });
      
      // Create modified cart items that include service charge and tip as separate line items
      const modifiedCartItems = [...cartItems];
      
      // Add service charge as a line item if enabled
      if (venueServiceCharge.enabled && serviceCharge > 0) {
        modifiedCartItems.push({
          id: 'service-charge',
          menuItemId: 'service-charge',
          name: `Service Charge ${venueServiceCharge.type === 'percentage' ? `(${venueServiceCharge.value}%)` : '(Flat Rate)'}`,
          price: serviceCharge,
          quantity: 1,
          modifiers: [],
          specialInstructions: ''
        } as any);
      }
      
      // Add tip as a line item if provided
      if (tipAmount > 0) {
        modifiedCartItems.push({
          id: 'tip',
          menuItemId: 'tip',
          name: 'Tip',
          price: tipAmount,
          quantity: 1,
          modifiers: [],
          specialInstructions: ''
        } as any);
      }

      console.log('Creating Stripe checkout session with:', {
        originalCartItems: cartItems.length,
        modifiedCartItems: modifiedCartItems.length,
        subtotal,
        serviceCharge,
        tipAmount,
        total,
        tableId,
        restaurantId
      });

      // Create Stripe checkout session with modified cart items that include charges
      const stripeSession = await createStripeCheckoutSession(
        modifiedCartItems,
        tableId,
        restaurantId,
        orderResponse._id
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
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to process your order';
      
      if (error instanceof Error) {
        if (error.message.includes('Table information is missing')) {
          errorMessage = 'Table information is missing. Please scan the QR code again.';
        } else if (error.message.includes('Invalid restaurant ID')) {
          errorMessage = 'Restaurant information is invalid. Please scan the QR code again.';
        } else if (error.message.includes('Authentication') || error.message.includes('login')) {
          errorMessage = 'Please log in to complete your order.';
        } else if (error.message.includes('Invalid calculated price')) {
          errorMessage = 'There was an issue with item pricing. Please refresh and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
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
        
        {cartItems.map((item) => {
          const itemTotal = item.price * item.quantity;
          const modifiersTotal = item.modifiers 
            ? item.modifiers.reduce((sum, mod) => sum + mod.price, 0) * item.quantity
            : 0;
          const lineTotal = itemTotal + modifiersTotal;
          
          return (
            <div key={item.id} className="flex justify-between py-2 text-sm text-white">
              <div>
                <span>{item.quantity} x {item.name}</span>
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="text-xs text-gray-400 ml-4">
                    {/* Check for cookingPreference property safely */}
                    {(item as any).cookingPreference && <div>• {(item as any).cookingPreference}</div>}
                    {item.modifiers.map(mod => (
                      <div key={mod.id}>• {mod.name} (+${mod.price.toFixed(2)})</div>
                    ))}
                  </div>
                )}
              </div>
              <span>${lineTotal.toFixed(2)}</span>
            </div>
          );
        })}
        
        <div className="border-t border-delft-blue/30 my-3"></div>
        
        <div className="flex justify-between text-sm py-2 text-white">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        
        {venueServiceCharge.enabled && serviceCharge > 0 && (
          <div className="flex justify-between text-sm py-2 text-white">
            <span>
              Service Charge {venueServiceCharge.type === 'percentage' 
                ? `(${venueServiceCharge.value}%)`
                : '(Flat Rate)'
              }
            </span>
            <span>${serviceCharge.toFixed(2)}</span>
          </div>
        )}
        
        {tipAmount > 0 && (
          <div className="flex justify-between text-sm py-2 text-white">
            <span>Tip</span>
            <span>${tipAmount.toFixed(2)}</span>
          </div>
        )}
        
        <div className="flex justify-between font-medium py-2 text-white">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
      
      {/* Tip Section */}
      <div className="bg-night rounded-lg border border-delft-blue p-4 mb-8">
        <h2 className="font-medium mb-4 text-white">Add Tip (Optional)</h2>
        
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[15, 18, 20, 22].map(percentage => {
            const tipValue = (subtotal * percentage) / 100;
            return (
              <Button
                key={percentage}
                variant={tipAmount === tipValue ? "default" : "outline"}
                onClick={() => setTipAmount(tipValue)}
                className="h-12 flex flex-col"
              >
                <span className="text-sm font-semibold">{percentage}%</span>
                <span className="text-xs">${tipValue.toFixed(2)}</span>
              </Button>
            );
          })}
        </div>
        
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Custom tip amount"
            value={tipAmount > 0 ? tipAmount.toFixed(2) : ''}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              setTipAmount(value);
            }}
            className="flex-1 px-3 py-2 bg-delft-blue/20 border border-delft-blue rounded text-white placeholder-gray-400"
            step="0.01"
            min="0"
          />
          <Button
            variant="outline"
            onClick={() => setTipAmount(0)}
            className="px-4"
          >
            No Tip
          </Button>
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
