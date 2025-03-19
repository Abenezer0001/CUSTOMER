
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Minus, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Cart: React.FC = () => {
  const { items, removeItem, updateQuantity, clearCart, subtotal } = useCart();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Simulated checkout process - in a real app, you'd connect to Stripe
  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    setIsCheckingOut(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setOrderPlaced(true);
      clearCart();
      
      // Redirect to home after order confirmation
      setTimeout(() => {
        navigate('/');
        toast.success("Thank you for your order!");
      }, 3000);
    }, 2000);
  };

  if (orderPlaced) {
    return (
      <div className="container mx-auto px-4 py-16 md:py-24 text-center max-w-md animate-fade-in">
        <CheckCircle className="mx-auto h-16 w-16 text-primary mb-6" />
        <h1 className="text-3xl font-medium mb-4">Order Confirmed!</h1>
        <p className="text-muted-foreground mb-8">
          Your order has been successfully placed. You'll be redirected to the homepage shortly.
        </p>
        <div className="animate-pulse bg-primary/10 h-2 w-full rounded-full overflow-hidden">
          <div className="bg-primary h-full animate-[progress_3s_ease-in-out]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 animate-fade-in">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-8 pl-0 hover:pl-1 transition-all"
        disabled={isCheckingOut}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <h1 className="text-3xl md:text-4xl font-medium mb-8">Your Cart</h1>
      
      {items.length === 0 ? (
        <div className="text-center py-16 max-w-md mx-auto">
          <h2 className="text-2xl font-medium mb-4">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">
            Looks like you haven't added any items to your cart yet.
          </p>
          <Button asChild size="lg" className="rounded-full px-8">
            <Link to="/menu">Browse Menu</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="flex items-stretch border border-border/50 rounded-xl overflow-hidden bg-card"
              >
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-24 h-24 object-cover"
                />
                
                <div className="flex-1 p-4 flex flex-col">
                  <div className="flex justify-between">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    ${item.price.toFixed(2)} each
                  </p>
                  
                  {item.specialInstructions && (
                    <p className="text-sm text-muted-foreground mb-2 italic">
                      "{item.specialInstructions}"
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center border border-border rounded-full overflow-hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-none h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={isCheckingOut}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="flex-1 text-center text-sm min-w-[30px]">
                        {item.quantity}
                      </span>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-none h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isCheckingOut}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      disabled={isCheckingOut}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-card border border-border/50 rounded-xl p-6 sticky top-24">
              <h3 className="text-xl font-medium mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>${(3.99).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${(subtotal * 0.08).toFixed(2)}</span>
                </div>
                
                <div className="border-t border-border pt-3 flex justify-between font-medium">
                  <span>Total</span>
                  <span>${(subtotal + 3.99 + subtotal * 0.08).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="promoCode" className="block text-sm font-medium mb-2">
                  Promo Code
                </label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="promoCode" 
                    placeholder="Enter code" 
                    className="flex-1"
                    disabled={isCheckingOut}
                  />
                  <Button variant="outline" disabled={isCheckingOut}>Apply</Button>
                </div>
              </div>
              
              <Button 
                className="w-full rounded-full" 
                size="lg"
                onClick={handleCheckout}
                disabled={isCheckingOut || items.length === 0}
              >
                {isCheckingOut ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    Checkout <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
