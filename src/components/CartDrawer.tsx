import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Trash2, Plus, Minus, X, ArrowRight, 
  CheckCircle, CreditCard, AlertCircle, Info 
} from 'lucide-react';
import { useTableInfo } from '@/context/TableContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { cartItems, removeFromCart: removeItem, updateQuantity, clearCart, cartTotal: subtotal } = useCart();
  const { tableNumber, restaurantName } = useTableInfo();
  const [stage, setStage] = useState<'cart' | 'checkout' | 'confirmation'>('cart');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeout'>('dine-in');
  
  // Tax and fees calculations
  const tax = subtotal * 0.08;
  const serviceFee = subtotal * 0.05;
  const total = subtotal + tax + serviceFee;
  
  // Reset stage when drawer closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to prevent visual glitches during closing animation
      setTimeout(() => {
        setStage('cart');
        setIsProcessing(false);
      }, 300);
    }
  }, [isOpen]);
  
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    // Move to checkout stage
    setStage('checkout');
  };
  
  const handlePlaceOrder = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      setStage('confirmation');
      
      // In real implementation, you would submit order to backend here
      // const order = {
      //   items: cartItems,
      //   tableNumber: tableNumber,
      //   restaurantId: "...",
      //   specialInstructions,
      //   orderType,
      //   subtotal,
      //   tax,
      //   serviceFee,
      //   total
      // };
      // submitOrder(order);
      
      // Clear cart after order is successfully placed
      setTimeout(() => {
        clearCart();
      }, 500);
    }, 2000);
  };
  
  const handleClose = () => {
    // If we're showing confirmation, clear the cart when closing
    if (stage === 'confirmation') {
      clearCart();
    }
    onClose();
  };

  // Conditional rendering based on stage
  let content;
  
  if (stage === 'confirmation') {
    content = (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12 space-y-6">
        <div className="bg-green-100 rounded-full p-4 mb-4">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold">Order Confirmed!</h2>
        
        <p className="text-muted-foreground">
          Your order has been received and will be prepared shortly.
          {tableNumber && ` We'll serve it to your table (${tableNumber}).`}
        </p>
        
        <div className="rounded-lg bg-muted p-4 w-full">
          <p className="font-medium flex items-center mb-2">
            <Info className="h-4 w-4 mr-2" />
            Order Details
          </p>
          <p className="text-sm mb-1">Order #: {Math.floor(Math.random() * 1000000)}</p>
          <p className="text-sm mb-1">Items: {cartItems.length}</p>
          <p className="text-sm">Total: ${total.toFixed(2)}</p>
        </div>
        
        <Button
          onClick={handleClose}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          Continue Shopping
        </Button>
      </div>
    );
  } else if (stage === 'checkout') {
    // Checkout stage UI
    content = (
      <div className="flex flex-col h-full">
        <SheetHeader className="p-4 border-b border-[#2D303E]">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setStage('cart')}
              className="mr-2"
            >
              <X className="h-5 w-5" />
            </Button>
            <SheetTitle className="text-xl font-semibold">Checkout</SheetTitle>
            <div className="w-8" /> {/* Empty div for alignment */}
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {/* Order summary */}
            <div className="space-y-3">
              <h3 className="font-medium text-lg">Order Summary</h3>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-sm">
                      {item.quantity} × {item.name}
                    </span>
                    <span className="text-sm font-medium">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Order Type */}
            <div className="space-y-3">
              <h3 className="font-medium text-lg">Order Type</h3>
              <div className="flex gap-2">
                <Button 
                  variant={orderType === 'dine-in' ? 'default' : 'outline'}
                  onClick={() => setOrderType('dine-in')}
                  className="flex-1"
                >
                  Dine In
                </Button>
                <Button 
                  variant={orderType === 'takeout' ? 'default' : 'outline'}
                  onClick={() => setOrderType('takeout')}
                  className="flex-1"
                >
                  Takeout
                </Button>
              </div>
            </div>
            
            {/* Special Instructions */}
            <div className="space-y-3">
              <h3 className="font-medium text-lg">Special Instructions</h3>
              <Textarea 
                placeholder="Add any special requests or allergies..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
        </ScrollArea>
        
        <div className="border-t border-[#2D303E] p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Fee</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium text-lg pt-2 border-t border-[#2D303E]">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          <Button 
            onClick={handlePlaceOrder}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                Place Order
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  } else {
    // Cart stage UI
    content = (
      <div className="flex flex-col h-full">
        <SheetHeader className="p-4 border-b border-[#2D303E]">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-semibold">Your Cart</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-muted-foreground mb-4">Your cart is empty</p>
              <Button onClick={handleClose} variant="outline">
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-lg bg-[#1F1D2B] border border-[#2D303E]"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-md"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://source.unsplash.com/featured/?food';
                      }}
                    />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{item.name}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <p className="text-sm text-purple-400 mt-1">${item.price.toFixed(2)}</p>
                    
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.modifiers.map((mod, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{mod.name}</span>
                            {mod.price > 0 && (
                              <span>+${mod.price.toFixed(2)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {item.specialInstructions && (
                      <div className="mt-1 text-xs italic text-muted-foreground">
                        {item.specialInstructions}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-5 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <span className="font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {cartItems.length > 0 && (
          <div className="border-t border-[#2D303E] p-4 space-y-3">
            <div className="flex justify-between font-medium">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleCheckout}
            >
              Continue to Checkout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md border-l border-[#2D303E] bg-[#16141F] p-0 max-h-screen"
      >
        {content}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
