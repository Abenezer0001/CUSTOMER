import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/constants';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrdersContext';
import { useAuth } from '@/hooks/useAuth';
import authService from '@/api/authService';
import apiClient from '@/api/apiClient';
import { useTableInfo } from '@/context/TableContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Trash2, Plus, Minus, X, ArrowRight, 
  Loader2, CreditCard, AlertCircle, Info 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { createOrder, OrderResponseData } from '@/api/orderService'; 
import { createStripeCheckoutSession } from '@/api/paymentService';
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

interface CartItem {
  id: string;
  menuItemId?: string; // Make it optional since it might not always be present
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  modifiers?: Array<{ id: string, name: string, price: number }>;
  image?: string;
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
  const { isAuthenticated, token } = useAuth();
  const { addOrder } = useOrders();
  const navigate = useNavigate();
  
  const [stage, setStage] = useState<'cart' | 'checkout'>('cart');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  
  // Tax and fees calculations (as per API specifications)
  const taxRate = 0.08; // 8% tax
  const serviceFeeRate = 0.05; // 5% service fee
  const tax = subtotal * taxRate;
  const serviceFee = subtotal * serviceFeeRate;
  const tipAmount = 0; // Default tip amount (can be updated)
  const total = subtotal + tax + serviceFee + tipAmount;
  
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
  
  // Helper function to process the order
  const processOrder = async () => {
    try {
      console.log('Processing order with orderService...');
      
      // Determine restaurant ID (either from context or extract from tableId)
      const localRestaurantId = restaurantName === 'InSeat' 
        ? '65f456b06c9dfd001b6b1234' 
        : tableId.split('-')[0]; // Ensure tableId is available here or passed appropriately
      
      // Format items according to API schema
      const formattedItems = cartItems.map(item => {
        // Ensure we have a valid string for menuItem
        const menuItemId = ('menuItemId' in item && item.menuItemId) || item.id;
        
        // Ensure menuItem is always a string
        const menuItem = String(menuItemId || '');
        
        return {
          menuItem,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
          specialInstructions: item.specialInstructions || specialInstructions || '',
          modifiers: item.modifiers
        };
      });
      
      // Format order data according to API schema
      const constructedOrderData: OrderData = {
        restaurantId: localRestaurantId, // Use locally determined restaurantId
        tableId,
        items: formattedItems,
        subtotal,
        tax,
        tip: tipAmount,
        total,
        orderType,
        specialInstructions: specialInstructions || '',
        serviceFee, // Include the service fee in the order data
        status: OrderStatus.PENDING, // Required field - using enum value
        paymentStatus: PaymentStatus.PENDING, // Required field - using enum value
        orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}` // Required field
      };
      
      console.log('Order data prepared:', JSON.stringify(constructedOrderData));
      
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
      
      // Use the enhanced createOrder function from orderService
      const result = await createOrder(cartItems, tableId, localRestaurantId, constructedOrderData, navigate);
      
      if (!result) {
        console.log('Order creation returned null - authentication failed and user redirected');
        return null;
      }
      
      console.log('Order placed successfully:', result);
      toast.success('Order placed successfully!');
    
      // Transform OrderResponseData to Order type for the context
      const orderForContext: Order = {
        id: result._id, // Map _id to id
        orderNumber: result.orderNumber,
        // Ensure items are compatible with CartItem[]
        // This might need a more detailed mapping if OrderItem and CartItem are very different
        // For now, assuming they are structurally similar enough or that CartItem is flexible
        items: result.items.map(apiItem => ({
          id: apiItem.menuItem, // Assuming menuItem from API maps to id in CartItem
          menuItemId: apiItem.menuItem,
          name: apiItem.name,
          price: apiItem.price,
          quantity: apiItem.quantity,
          // image: apiItem.image, // If CartItem expects an image and apiItem has it
          specialInstructions: apiItem.specialInstructions,
          modifiers: apiItem.modifiers?.map(mod => ({ id: mod.name, name: mod.name, price: mod.price })) || [] // Example mapping for modifiers
        })),
        subtotal: result.subtotal,
        tax: result.tax,
        serviceFee: result.serviceFee,
        tip: result.tip,
        total: result.total,
        status: result.status, // Assuming OrderStatus enum values align
        paymentStatus: result.paymentStatus, // Assuming PaymentStatus enum values align
        timestamp: new Date(result.createdAt), // Convert createdAt string to Date
        tableId: result.tableId,
        specialInstructions: result.specialInstructions
      };

      addOrder(orderForContext);

      console.log('Order created successfully:', result);
      
      // Store order ID in localStorage for retrieval after payment
      localStorage.setItem('pending_order_id', result._id);
      
      // Clear the cart and close the drawer
      clearCart();
      onClose();
      
      // Show success message
      toast.success('Order placed successfully!');
      
      // The payment status should remain PENDING by default when an order is created
      // It will be updated to PAID by Stripe webhook when payment is completed
      console.log('Order created with PENDING payment status - will be updated when payment is processed');
      
      // Add a small delay before redirecting to ensure the toast is shown
      setTimeout(() => {
        console.log('Redirecting to my-orders page with table ID:', tableId);
        navigate(`/my-orders?table=${tableId}`);
      }, 1000);
    } catch (orderError) {
      console.error('Error in order creation process:', orderError);
      toast.error(orderError instanceof Error ? orderError.message : 'Failed to create your order');
      setIsProcessing(false);
      setError(orderError instanceof Error ? orderError.message : 'Failed to create your order');
      throw orderError; // Re-throw to be caught by the caller
    }
  };

  // Handle guest login
  const handleGuestLogin = React.useCallback(async (tableId: string) => {
    try {
      console.log('Attempting guest login with tableId:', tableId);
      
      // Get API base URL from environment variables
      const apiBaseUrl = import.meta.env.VITE_AUTH_API_URL || `${API_BASE_URL}/api/auth`;
      
      // Request a guest token directly from the server endpoint
      const response = await fetch(`${apiBaseUrl}/guest-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tableId: tableId || '',
          deviceId: localStorage.getItem('device_id') || `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          console.log('Guest token received:', data.token.substring(0, 10) + '...');
          
          // Store token in both localStorage and cookies for redundancy
          localStorage.setItem('auth_token', data.token);
          document.cookie = `auth_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `access_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
          
          return true;
        }
      }
      
      console.error('Guest login failed: No token in response');
      return false;
    } catch (error) {
      console.error('Guest login error:', error);
      return false;
    }
  }, []);
  
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    // Move to checkout stage
    setStage('checkout');
  };
  
  const handlePlaceOrder = async (): Promise<void> => {
    console.log('handlePlaceOrder function entered - CartDrawer.tsx');
    try {
      // Validate cart is not empty
      if (cartItems.length === 0) {
        toast.error('Your cart is empty. Please add items to place an order.');
        return;
      }
      
      // Validate table ID is present
      if (!tableId) {
        toast.error("Table information is missing. Please scan a table QR code first.");
        onClose();
        navigate('/scan');
        return;
      }
      
      if (!tableId) {
        toast.error("Table information is missing. Please scan a table QR code first.");
        onClose();
        navigate('/scan');
        return;
      }
      
      setIsProcessing(true);
      
      // Process the order (this will create the order in the backend and get the order ID)
      await processOrder();
    } catch (error) {
      console.error('Error placing order:', error);
      setIsProcessing(false);
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
      setError(error instanceof Error ? error.message : 'Failed to place order');
    }
  };
  
  const handleClose = () => {
    if (isProcessing) {
      // If processing is in progress, show a confirmation dialog
      if (window.confirm("Your order is still being processed. Are you sure you want to close?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };
  
  let content;
  
  if (stage === 'checkout') {
    // Checkout stage UI
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
            {/* Order type selection */}
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
            
            {/* Cart items summary */}
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
            
            {/* Order notes */}
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
            onClick={() => { 
              console.log('Place Order button clicked - inline in CartDrawer.tsx'); 
              handlePlaceOrder(); 
            }}
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
