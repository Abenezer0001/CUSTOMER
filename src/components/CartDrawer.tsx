import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/constants';
import { useCart, CartItem } from '@/context/CartContext';
import { useOrders } from '@/context/OrdersContext';
import { useAuth } from '@/hooks/useAuth';
import { useTableInfo } from '@/context/TableContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Minus, X, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { createOrder, OrderResponseData } from '@/api/orderService';
import { useNavigate } from 'react-router-dom';
import type { Order } from '@/types';

// Order type enum to match API
enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEOUT = 'TAKEOUT'
}

// Order status enum to match API
enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Payment status enum to match API
enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

interface OrderData {
  restaurantId: string;
  tableId: string;
  items: Array<{
    menuItem: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
    specialInstructions: string;
    modifiers?: Array<{ name: string, price: number }>;
  }>;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  orderType: OrderType;
  specialInstructions: string;
  serviceFee: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  orderNumber: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { cartItems, removeFromCart: removeItem, updateQuantity, clearCart, cartTotal: subtotal } = useCart();
  const { tableId, restaurantName } = useTableInfo();
  const { isAuthenticated, token, user, refreshToken } = useAuth();
  const { addOrder } = useOrders();
  const navigate = useNavigate();

  const [stage, setStage] = useState<'cart' | 'checkout'>('cart');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);

  // Add refs for preventing duplicate submissions
  const isSubmittingRef = useRef(false);
  const currentRequestIdRef = useRef<string | null>(null);

  // Tax and fees calculations
  const taxRate = 0.08;
  const serviceFeeRate = 0.05;
  const tax = subtotal * taxRate;
  const serviceFee = subtotal * serviceFeeRate;
  const tipAmount = 0;
  const total = subtotal + tax + serviceFee + tipAmount;

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStage('cart');
        setIsProcessing(false);
        // Reset submission state when drawer closes
        isSubmittingRef.current = false;
        currentRequestIdRef.current = null;
      }, 300);
    }
  }, [isOpen]);

  const processOrder = async (requestId: string) => {
    // Double-check that this request should still proceed
    if (currentRequestIdRef.current !== requestId) {
      console.log('Request cancelled - newer request in progress');
      return null;
    }

    try {
      const localRestaurantId = restaurantName === 'InSeat'
        ? '65f456b06c9dfd001b6b1234'
        : tableId.split('-')[0];

      const formattedItems = cartItems.map(item => ({
        menuItem: String(item.id),
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
        specialInstructions: item.specialInstructions || specialInstructions || '',
        modifiers: item.modifiers
      }));

      const constructedOrderData: OrderData = {
        restaurantId: localRestaurantId,
        tableId,
        items: formattedItems,
        subtotal,
        tax,
        tip: tipAmount,
        total,
        orderType,
        specialInstructions: specialInstructions || '',
        serviceFee,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      };
      
      // Check authentication status before attempting to create order
      if (!isAuthenticated) {
        // Store cart state for retrieval after login
        localStorage.setItem('pendingCart', JSON.stringify({
          items: cartItems,
          tableId,
          restaurantId: localRestaurantId
        }));
        
        // Redirect to login with return URL
        toast.error('Please log in to place an order');
        onClose(); // Close the cart drawer
        navigate(`/login?returnTo=/table/${tableId}`);
        return null;
      }
      
      console.log(`Creating order using orderService (Request ID: ${requestId})...`);
      
      // Final check before API call
      if (currentRequestIdRef.current !== requestId) {
        console.log('Request cancelled before API call - newer request in progress');
        return null;
      }
      
      // Use ONLY the createOrder function from orderService - this prevents duplicate orders
      const orderResult = await createOrder(cartItems, tableId, localRestaurantId, constructedOrderData, navigate);
      
      // Check if request is still valid after API call
      if (currentRequestIdRef.current !== requestId) {
        console.log('Request completed but cancelled due to newer request');
        return null;
      }
      
      if (!orderResult) {
        console.log('Order creation returned null - authentication failed and user redirected');
        return null;
      }
      
      console.log(`Order placed successfully (Request ID: ${requestId}):`, orderResult);
      toast.success('Order placed successfully!');
    
      // Transform OrderResponseData to Order type for the context
      const orderForContext: Order = {
        id: orderResult._id,
        orderNumber: orderResult.orderNumber,
        items: orderResult.items.map(apiItem => ({
          id: apiItem.menuItem,
          menuItemId: apiItem.menuItem,
          name: apiItem.name,
          price: apiItem.price,
          quantity: apiItem.quantity,
          specialInstructions: apiItem.specialInstructions,
          modifiers: apiItem.modifiers?.map(mod => ({ id: mod.name, name: mod.name, price: mod.price })) || []
        })),
        subtotal: orderResult.subtotal,
        tax: orderResult.tax,
        serviceFee: orderResult.serviceFee,
        tip: orderResult.tip,
        total: orderResult.total,
        status: orderResult.status,
        paymentStatus: orderResult.paymentStatus,
        timestamp: new Date(orderResult.createdAt),
        tableId: orderResult.tableId,
        specialInstructions: orderResult.specialInstructions
      };

      addOrder(orderForContext);
      localStorage.setItem('pending_order_id', orderResult._id);
      clearCart();
      onClose();

      // Force refresh authentication state to ensure we have the latest user data
      try {
        await refreshToken();
        console.log('Auth refreshed after order placement');
      } catch (refreshError) {
        console.error('Failed to refresh auth after order placement:', refreshError);
      }

      // Ensure we're redirecting to the my-orders page with the table ID
      console.log(`Redirecting to my-orders page with table=${tableId}`);
      
      // Use a more direct approach to navigation instead of setTimeout
      navigate(`/my-orders?table=${tableId}`);
      return orderResult;
    } catch (error) {
      console.error(`Error in order creation process (Request ID: ${requestId}):`, error);
      toast.error(error instanceof Error ? error.message : 'Failed to create your order');
      throw error;
    }
  };

  const handlePlaceOrder = async (): Promise<void> => {
    // Immediate check to prevent double submission
    if (isSubmittingRef.current) {
      console.log('Order submission already in progress - ignoring duplicate click');
      return;
    }

    // Generate unique request ID
    const requestId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`Starting order placement (Request ID: ${requestId})`);

    try {
      if (cartItems.length === 0) {
        toast.error('Your cart is empty. Please add items to place an order.');
        return;
      }

      if (!tableId) {
        toast.error("Table information is missing. Please scan a table QR code first.");
        onClose();
        navigate('/scan');
        return;
      }

      // Set submission locks immediately
      isSubmittingRef.current = true;
      currentRequestIdRef.current = requestId;
      setIsProcessing(true);

      await processOrder(requestId);
    } catch (error) {
      console.error(`Error placing order (Request ID: ${requestId}):`, error);
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
      setError(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      // Always reset submission state
      isSubmittingRef.current = false;
      currentRequestIdRef.current = null;
      setIsProcessing(false);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setStage('checkout');
  };

  const handleClose = () => {
    if (isProcessing) {
      if (window.confirm("Your order is still being processed. Are you sure you want to close?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  let content;
  if (stage === 'checkout') {
    content = (
      <div className="flex flex-col h-full">
        <SheetHeader className="p-4 border-b border-[#2D303E]">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-semibold">Checkout</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isProcessing}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <h3 className="font-medium">Order Type</h3>
              <div className="flex gap-2">
                <Button
                  variant={orderType === OrderType.DINE_IN ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    orderType === OrderType.DINE_IN 
                      ? "bg-delft-blue hover:bg-delft-blue/90" 
                      : ""
                  )}
                  onClick={() => setOrderType(OrderType.DINE_IN)}
                  disabled={isProcessing}
                >
                  Dine In
                </Button>
                <Button
                  variant={orderType === OrderType.TAKEOUT ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    orderType === OrderType.TAKEOUT 
                      ? "bg-delft-blue hover:bg-delft-blue/90" 
                      : ""
                  )}
                  onClick={() => setOrderType(OrderType.TAKEOUT)}
                  disabled={isProcessing}
                >
                  Takeout
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Order Items</h3>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-delft-blue"
                  onClick={() => setStage('cart')}
                  disabled={isProcessing}
                >
                  Edit
                </Button>
              </div>
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex">
                      <span className="font-medium">{item.quantity}x</span>
                      <span className="ml-2">{item.name}</span>
                    </div>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Special Instructions</h3>
              <Textarea 
                placeholder="Add any special instructions for your order..."
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
              <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(0)}%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Fee ({(serviceFeeRate * 100).toFixed(0)}%)</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tip</span>
                <span>${tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-lg pt-2 border-t border-[#2D303E]">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          <Button 
            onClick={handlePlaceOrder}
            className="w-full bg-delft-blue hover:bg-delft-blue/90 text-white"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
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
                    
                    <p className="text-sm text-delft-blue mt-1">${item.price.toFixed(2)}</p>
                    
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
              className="w-full bg-delft-blue hover:bg-delft-blue/90 text-white"
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
