import React from 'react';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrdersContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, X, MinusCircle, PlusCircle, ShoppingCart, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const { createOrder } = useOrders();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity > 0) {
      updateQuantity(itemId, newQuantity);
    } else {
      removeFromCart(itemId);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please login to checkout');
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      createOrder({
        items: cartItems,
        total: cartTotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: user.id
      });
      
      toast.success('Order placed successfully!');
      clearCart();
      navigate('/orders');
    } catch (error) {
      toast.error('Failed to create order. Please try again.');
    }
  };

  const formattedTotal = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(cartTotal);

  return (
    <div className="container mx-auto px-4 py-6 mt-16 mb-20">
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
                onClick={handleCheckout}
                className="w-full"
                disabled={cartItems.length === 0}
              >
                Proceed to Checkout
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/')}
              >
                Continue Shopping
              </Button>
              
              {!user && (
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
                      className="w-full"
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