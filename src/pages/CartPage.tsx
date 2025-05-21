import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useTableInfo } from '@/context/TableContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, X, MinusCircle, PlusCircle, ShoppingCart, ChevronRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createOrder } from '@/api/orderService';
import { createStripeCheckoutSession } from '@/api/paymentService';
import { useOrders } from '@/context/OrdersContext';

const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
  const { user, token, isAuthenticated } = useAuth();
  const { tableId, restaurantName } = useTableInfo();
  const { addOrder } = useOrders();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity > 0) {
      updateQuantity(itemId, newQuantity);
    } else {
      removeFromCart(itemId);
    }
  };

  const handlePlaceOrder = async () => {
    if (!tableId) {
      toast.error('Table information is missing. Please scan a table QR code first.');
      navigate('/scan-table');
      return;
    }

    if (!isAuthenticated || !token) {
      toast.error('Please login to place your order');
      navigate('/login', { state: { returnUrl: '/cart' } });
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Determine restaurant ID (either from context or extract from tableId)
      const restaurantId = restaurantName === 'InSeat' 
        ? '65f456b06c9dfd001b6b1234' 
        : tableId.split('-')[0];
      
      // Step 1: Create the order in our system
      const orderResponse = await createOrder(
        cartItems,
        tableId,
        restaurantId,
        token
      );
      
      if (!orderResponse || !orderResponse._id) {
        throw new Error('Failed to create order');
      }
      
      // Add the order to local context
      addOrder({
        id: orderResponse._id,
        items: cartItems,
        subtotal: cartTotal,
        tax: cartTotal * 0.1,
        total: cartTotal * 1.1,
        status: 'pending',
        timestamp: new Date(orderResponse.createdAt),
        tableNumber: tableId
      });
      
      toast.success('Order created successfully! Redirecting to payment...');
        
      // Step 2: Create Stripe checkout session
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
      console.error('Order creation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create your order');
      setIsProcessing(false);
    }
  };

  const formattedTotal = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(cartTotal);

  return (
    <div className="container mx-auto px-4 py-6 mt-16 mb-20 bg-raisin-black">
      <div className="flex justify-between items-center mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to menu
        </Link>
        
        {cartItems.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if (window.confirm('Are you sure you want to clear your cart?')) {
                clearCart();
                toast.success('Cart cleared');
              }
            }}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4 mr-2" /> Clear cart
          </Button>
        )}
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Cart Items */}
        <div className="w-full lg:w-2/3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Your Cart
                {cartItems.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {cartItems.length === 0 
                  ? 'Your cart is empty' 
                  : 'Review your items before checkout'}
              </CardDescription>
            </CardHeader>
            
            {cartItems.length === 0 ? (
              <CardContent className="text-center py-10">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                  <p className="text-lg">Your cart is empty</p>
                  <p className="text-sm text-muted-foreground">
                    Looks like you haven't added any items to your cart yet.
                  </p>
                  <Button 
                    onClick={() => navigate('/')}
                    className="mt-2"
                  >
                    Browse Menu
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent>
                <ScrollArea className="h-[calc(100vh-350px)] pr-4">
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center">
                        {item.image && (
                          <div className="h-16 w-16 rounded-md overflow-hidden mr-4 flex-shrink-0">
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        
                        <div className="flex-grow">
                          <div className="flex justify-between">
                            <h3 className="font-medium">{item.name}</h3>
                            <p className="font-semibold">
                              £{(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              >
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                              
                              <span className="mx-2">{item.quantity}</span>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              >
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            )}
          </Card>
        </div>
        
        {/* Order Summary */}
        <div className="w-full lg:w-1/3">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formattedTotal}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>£0.00</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span>£0.00</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formattedTotal}</span>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-2">
              <Button 
                onClick={handlePlaceOrder}
                className="w-full bg-delft-blue hover:bg-delft-blue/90"
                disabled={cartItems.length === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  'Place Order'
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full border-delft-blue text-delft-blue hover:bg-delft-blue/10" 
                onClick={() => navigate('/')}
              >
                Continue Shopping
              </Button>
              
              {!isAuthenticated && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  You need to be logged in to complete your order
                </p>
              )}
            </CardFooter>
          </Card>
          
          {cartItems.length > 0 && (
            <div className="mt-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Reward Program</CardTitle>
                </CardHeader>
                
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Complete this order to earn {Math.floor(cartTotal)} loyalty points!
                  </p>
                  
                  <div className="mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-delft-blue text-delft-blue hover:bg-delft-blue/10"
                      onClick={() => navigate('/account')}
                    >
                      <span>View Rewards</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartPage; 