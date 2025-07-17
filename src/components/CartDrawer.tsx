import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/constants';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrdersContext';
import { useAuth } from '@/hooks/useAuth';
import authService from '@/api/authService';
import customerAuthService from '@/api/customerAuthService';
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
import TableService from '@/api/tableService';

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
  const { cartItems, removeFromCart: removeItem, updateQuantity, clearCart, addTip } = useCart();
  const { tableId, restaurantName } = useTableInfo();
  const { isAuthenticated, token, user } = useAuth();
  const { addOrder } = useOrders();
  const navigate = useNavigate();
  
  const [stage, setStage] = useState<'cart' | 'checkout'>('cart');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Derived values
  const subtotal = cartItems.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    const modifiersTotal = item.modifiers 
      ? item.modifiers.reduce((mSum, modifier) => mSum + modifier.price, 0) * item.quantity
      : 0;
    return sum + itemTotal + modifiersTotal;
  }, 0);
  const serviceFeePct = 0.1; // 10% service fee
  const serviceFee = subtotal * serviceFeePct;
  const taxRate = 0.0825; // 8.25% sales tax
  const tax = subtotal * taxRate;
  const [tipAmount, setTipAmount] = useState(0);
  const total = subtotal + tax + tipAmount + serviceFee;
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const [tipPercentage, setTipPercentage] = useState<number | null>(null);
  const tipOptions = [0.15, 0.18, 0.2, 0.22];

  // Handle tip selection
  const handleTipSelection = (percentage: number | null) => {
    setTipPercentage(percentage);

    if (percentage === null) {
      setTipAmount(0);
      addTip(0);
    } else {
      const newTipAmount = subtotal * percentage;
      setTipAmount(newTipAmount);
      addTip(newTipAmount);
    }
  };

  // Helper function to check authentication using the auth context
  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status from CartDrawer');
      console.log('Current auth state:', { isAuthenticated, token, user: user?.email });
      
      // First check if we're already authenticated in the context
      // For credential users, token might be in cookies, so we check isAuthenticated && user
      if (isAuthenticated && user) {
        console.log('User is authenticated in context');
        return true;
      }
      
      // If not authenticated in context but we have cookies, try to refresh auth
      const cookies = document.cookie.split(';').map(c => c.trim());
      const hasAuthCookies = cookies.some(cookie => 
        cookie.startsWith('access_token=') || 
        cookie.startsWith('auth_token=') ||
        cookie.startsWith('refresh_token=')
      );
      
      if (hasAuthCookies) {
        console.log('Found auth cookies, attempting to refresh auth state');
        
        // Try to get current user from customer auth service
        try {
          const customerResponse = await customerAuthService.getCurrentUser();
          if (customerResponse.success && customerResponse.user) {
            console.log('Successfully refreshed auth state via customer service');
            
            // Dispatch auth state change event to update the context
            window.dispatchEvent(new CustomEvent('auth-state-changed', { 
              detail: { 
                isAuthenticated: true, 
                user: customerResponse.user 
              } 
            }));
            
            return true;
          }
        } catch (error) {
          console.log('Customer auth service failed, trying regular auth service');
          
          // Fallback to regular auth service
          try {
            const authResponse = await authService.getCurrentUser();
            if (authResponse.success && authResponse.user) {
              console.log('Successfully refreshed auth state via auth service');
              
              // Dispatch auth state change event
              window.dispatchEvent(new CustomEvent('auth-state-changed', { 
                detail: { 
                  isAuthenticated: true, 
                  user: authResponse.user 
                } 
              }));
              
              return true;
            }
          } catch (authError) {
            console.log('Both auth services failed');
          }
        }
      }
      
      console.log('User is not authenticated');
      return false;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  };
  
  // Helper function to process the order
  const processOrder = async () => {
    try {
      if (!tableId) {
        throw new Error('Table ID is required to place an order');
      }

      // Get restaurant ID from table using the TableService
      console.log('Getting restaurant ID from table:', tableId);
      let restaurantId;
      
      try {
        restaurantId = await TableService.getRestaurantIdFromTableId(tableId);
        console.log('Successfully got restaurant ID from table:', restaurantId);
      } catch (tableError) {
        console.error('Failed to get restaurant ID from table:', tableError);
        throw new Error('Unable to determine restaurant for this table. Please try again or contact support.');
      }
      
      // Format items according to API schema
      const formattedItems = cartItems.map(item => {
        // Ensure we have a valid string for menuItem
        let menuItemId = ('menuItemId' in item && item.menuItemId) || item.id;
        
        // Clean the menuItemId to extract only the ObjectId part (first 24 characters)
        // Remove any timestamp suffix that might be appended
        if (menuItemId && menuItemId.includes('-')) {
          menuItemId = menuItemId.split('-')[0];
        }
        
        // Ensure it's a valid ObjectId format (24 hex characters)
        if (menuItemId && menuItemId.length > 24) {
          menuItemId = menuItemId.substring(0, 24);
        }
        
        // Ensure menuItem is always a string
        const menuItem = String(menuItemId || '');
        
        // Calculate subtotal including modifiers
        const modifiersTotal = item.modifiers 
          ? item.modifiers.reduce((mSum, modifier) => mSum + modifier.price, 0) * item.quantity
          : 0;
        const itemSubtotal = (item.price * item.quantity) + modifiersTotal;

        // Format modifiers according to backend API schema
        const formattedModifiers: any[] = [];
        
        if (item.modifiers && item.modifiers.length > 0) {
          // Group modifiers by groupId
          const modifierGroups = item.modifiers.reduce((groups, modifier) => {
            if (modifier.groupId) {
              if (!groups[modifier.groupId]) {
                groups[modifier.groupId] = [];
              }
              groups[modifier.groupId].push(modifier);
            }
            return groups;
          }, {} as Record<string, any[]>);
          
          // Convert to the expected format
          Object.entries(modifierGroups).forEach(([groupId, selections]) => {
            formattedModifiers.push({
              groupId,
              selections: selections.map(sel => ({
                optionId: sel.optionId,
                name: sel.name,
                quantity: 1,
                price: sel.price
              }))
            });
          });
        }

        return {
          menuItem,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: itemSubtotal,
          specialInstructions: item.specialInstructions || '',
          modifiers: formattedModifiers
        };
      });
      
      // Format order data according to API schema
      const constructedOrderData: OrderData = {
        restaurantId, // Use restaurant ID from table service
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

      console.log('Placing order...');
      console.log('Order data for service:', JSON.stringify(constructedOrderData));
      
      // Try to get a token from all possible sources
      let token = localStorage.getItem('auth_token');
      
      // Clean up the placeholder if it exists
      if (token === 'http-only-cookie-present') {
        localStorage.removeItem('auth_token');
        token = null;
      }
      
      // If no token found yet, try to extract from non-HTTP-only cookies (guest users)
      if (!token) {
        const cookies = document.cookie.split(';');
        const tokenCookie = cookies.find(cookie => 
          cookie.trim().startsWith('auth_token=') || 
          cookie.trim().startsWith('jwt=')
        );
        
        if (tokenCookie) {
          token = tokenCookie.split('=')[1].trim();
        }
      }
      
      // Check if we have HTTP-only cookies (credential users)
      const cookies = document.cookie.split(';').map(c => c.trim());
      const hasHttpOnlyCookies = cookies.some(cookie => 
        cookie.startsWith('access_token=') || 
        cookie.startsWith('refresh_token=') ||
        cookie.startsWith('_dd_s=') // DataDog session cookie indicates HTTP-only cookies
      );
      
      console.log('Token status:', {
        hasLocalStorageToken: !!token,
        hasHttpOnlyCookies,
        tokenLength: token ? token.length : 0
      });
      
      try {
        // Use XMLHttpRequest for order creation
        console.log('Using XMLHttpRequest for order creation...');
        
        const result = await new Promise<OrderResponseData>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const orderApiUrl = import.meta.env.VITE_ORDER_API_URL || `${API_BASE_URL}/orders`;
          xhr.open('POST', orderApiUrl, true);
          xhr.withCredentials = true; // This ensures HTTP-only cookies are sent
          xhr.setRequestHeader('Content-Type', 'application/json');
          
          // Only add Authorization header if we have a valid token (not for HTTP-only cookie users)
          if (token && token !== 'http-only-cookie-present' && token.length > 10) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            console.log('Added Authorization header with token');
          } else if (hasHttpOnlyCookies) {
            console.log('Using HTTP-only cookies for authentication (no Authorization header needed)');
          } else {
            console.warn('No authentication token available. Order creation may fail.');
          }
          
          xhr.onload = async function() {
            console.log('XHR response received:', {
              status: xhr.status,
              responseText: xhr.responseText
            });
            
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const parsedResponse = JSON.parse(xhr.responseText);
                console.log('Parsed response:', parsedResponse);
                
                // Check if response has success property (API v1 format)
                if (parsedResponse.success !== undefined) {
                  if (parsedResponse.success) {
                    resolve(parsedResponse.data);
                  } else {
                    console.error('Order creation failed despite 200 status:', parsedResponse.error);
                    reject(new Error(parsedResponse.error?.message || 'Order creation failed'));
                  }
                } 
                // If no success property but has _id, it's a direct order object (API v2 format)
                else if (parsedResponse._id) {
                  console.log('Direct order object returned:', parsedResponse);
                  resolve(parsedResponse);
                } 
                // Unknown response format
                else {
                  console.error('Unknown response format:', parsedResponse);
                  reject(new Error('Unknown response format'));
                }
              } catch (e) {
                console.error('Failed to parse response:', e);
                reject(new Error('Failed to parse response'));
              }
            } else {
              console.error(`Order creation failed with status: ${xhr.status}`, xhr.responseText);
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error(errorData.error || `Order creation failed with status: ${xhr.status}`));
              } catch (e) {
                reject(new Error(`Order creation failed with status: ${xhr.status}`));
              }
            }
          };
          
          xhr.onerror = function() {
            console.error('XHR error:', xhr);
            reject(new Error('Network error occurred'));
          };
          
          xhr.send(JSON.stringify(constructedOrderData));
        });
        
        console.log('Order placed successfully:', result);
        toast.success('Order placed successfully!');
      
        // Transform OrderResponseData to Order type for the context
        const orderForContext: Order = {
          id: result._id,
          orderNumber: result.orderNumber,
          items: result.items.map(apiItem => ({
            id: apiItem.menuItem,
            menuItemId: apiItem.menuItem,
            name: apiItem.name,
            price: apiItem.price,
            quantity: apiItem.quantity,
            specialInstructions: apiItem.specialInstructions,
            modifiers: apiItem.modifiers?.map(mod => ({ id: mod.name, name: mod.name, price: mod.price })) || []
          })),
          subtotal: result.subtotal,
          tax: result.tax,
          serviceFee: result.serviceFee,
          tip: result.tip,
          total: result.total,
          status: result.status,
          paymentStatus: result.paymentStatus,
          timestamp: new Date(result.createdAt),
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
        
        // Reset processing state before navigation
        setIsProcessing(false);
        
        // Add a small delay before redirecting to ensure the toast is shown
        setTimeout(() => {
          console.log('Redirecting to my-orders page with table ID:', tableId);
          navigate(`/my-orders?table=${tableId}`);
        }, 1000);
      } catch (error) {
        console.error('Order creation failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create your order';
        toast.error(errorMessage);
        
        // Handle authentication errors specifically
        if (errorMessage.includes('session has expired') || 
            errorMessage.includes('Authentication') || 
            errorMessage.includes('Unauthorized')) {
          // Clear invalid tokens
          localStorage.removeItem('auth_token');
          // Redirect to login
          onClose();
          navigate('/login', { state: { returnUrl: '/cart' } });
        }
      }
    } catch (error) {
      console.error('Error in processOrder:', error);
      throw error;
    }
  };

  const handlePlaceOrder = async () => {
    console.log('handlePlaceOrder function entered - CartDrawer.tsx');
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    if (!tableId) {
      toast.error('Please scan a table QR code first');
      onClose();
      navigate('/scan-table');
      return;
    }
    
    // Clear any existing pending order ID to prevent conflicts
    localStorage.removeItem('pending_order_id');
    
    setIsProcessing(true);
    setError('');
    
    try {
      console.log('Starting order placement process...');
      
      // Check if user is authenticated
      const isAuthenticated = await checkAuthStatus();
      console.log('Auth check result:', isAuthenticated);
      
      if (!isAuthenticated) {
        console.log('User not authenticated - redirecting to login');
        
        // Save cart data to restore after login
        localStorage.setItem('pendingCart', JSON.stringify(cartItems));
        if (tableId) {
          localStorage.setItem('pendingTableId', tableId);
        }
        
        // Show error message and stop processing
        toast.error('Please log in or create an account to place an order');
        setIsProcessing(false);
        onClose();
        
        // Redirect to login page with return URL
        navigate('/login', { state: { returnUrl: window.location.pathname } });
        return;
      }
      
      // If we get here, user is authenticated - proceed with order regardless of token storage method
      console.log('User is authenticated, proceeding with order placement...');
      await processOrder();
    } catch (error) {
      console.error('Error during order placement:', error);
      let errorMessage = 'Failed to process your order';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      
      // Handle authentication-related errors
      const isAuthError = errorMessage.toLowerCase().includes('session') || 
                         errorMessage.toLowerCase().includes('auth') || 
                         errorMessage.toLowerCase().includes('token') ||
                         errorMessage.toLowerCase().includes('401') ||
                         errorMessage.toLowerCase().includes('403');
      
      if (isAuthError) {
        // Clear all auth tokens
        console.log('Clearing auth tokens due to authentication error');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('access_token');
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        toast.error('Your session has expired. Please log in again.');
        setIsProcessing(false);
        onClose();
        navigate('/login', { state: { returnUrl: '/cart' } });
      } else {
        // For other errors, just show the message
        console.error('Non-auth error during order placement:', errorMessage);
        toast.error(errorMessage);
        setIsProcessing(false);
      }
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Your Order</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full">
          {/* Cart content goes here - keeping existing JSX structure */}
          <div className="flex-1 overflow-auto">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-gray-500 mb-4">Your cart is empty</p>
                <Button onClick={onClose} variant="outline">
                  Continue browsing menu
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                      
                      {/* Show modifiers if any */}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs text-gray-600">Modifiers:</p>
                          {item.modifiers.map((modifier, index) => (
                            <p key={index} className="text-xs text-gray-500">
                              • {modifier.name} (+${modifier.price.toFixed(2)})
                            </p>
                          ))}
                        </div>
                      )}
                      
                      {/* Show special instructions if any */}
                      {item.specialInstructions && (
                        <p className="text-xs text-gray-600 mt-1">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {cartItems.length > 0 && (
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee:</span>
                  <span>${serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tip:</span>
                  <span>${tipAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Special Instructions */}
              <div className="space-y-2">
                <label htmlFor="special-instructions" className="text-sm font-medium">
                  Special Instructions (Optional)
                </label>
                <Textarea
                  id="special-instructions"
                  placeholder="Any special requests for your order..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={3}
                  className="w-full"
                />
              </div>
              
              <Button
                onClick={handlePlaceOrder}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Place Order'
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;