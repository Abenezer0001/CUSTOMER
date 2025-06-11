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
  const { isAuthenticated, token } = useAuth();
  const { addOrder } = useOrders();
  const navigate = useNavigate();
  
  const [stage, setStage] = useState<'cart' | 'checkout'>('cart');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Derived values
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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

  // Helper function to check authentication
  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        // We have a token, check if it's valid
        return true;
      }
      
      // If we still don't have a token, make a regular auth check
      console.log('Attempting regular auth check as fallback...');
      const apiBaseUrl = import.meta.env.VITE_AUTH_API_URL || `${API_BASE_URL}/api/auth`;
      
      try {
        const authResponse = await fetch(`${apiBaseUrl}/me`, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (authResponse.ok) {
          const authData = await authResponse.json();
          console.log('Auth check successful:', authData);
          
          if (authData.token) {
            localStorage.setItem('auth_token', authData.token);
            return true;
          }
        } else {
          const responseText = await authResponse.text();
          console.error('Authentication check failed:', responseText);
        }
      } catch (fetchError) {
        console.error('Error during authentication fetch:', fetchError);
      }
      
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
        const menuItemId = ('menuItemId' in item && item.menuItemId) || item.id;
        
        // Ensure menuItem is always a string
        const menuItem = String(menuItemId || '');
        
        return {
          menuItem,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
          specialInstructions: item.specialInstructions || specialInstructions || ''
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
      
      // If no token found yet, try to extract from cookies
      if (!token) {
        const cookies = document.cookie.split(';');
        const tokenCookie = cookies.find(cookie => 
          cookie.trim().startsWith('auth_token=') || 
          cookie.trim().startsWith('access_token=')
        );
        
        if (tokenCookie) {
          token = tokenCookie.split('=')[1].trim();
        }
      }
      
      // If still no token, make a regular auth check
      if (!token) {
        console.log('Attempting regular auth check as fallback...');
        const apiBaseUrl = import.meta.env.VITE_AUTH_API_URL || `${API_BASE_URL}/api/auth`;
        const authResponse = await fetch(`${apiBaseUrl}/me`, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (authResponse.ok) {
          const authData = await authResponse.json();
          console.log('Auth check successful:', authData);
          
          if (authData.token) {
            token = authData.token;
            localStorage.setItem('auth_token', authData.token);
          }
        } else {
          console.error('Authentication check failed:', await authResponse.text());
        }
      }
      
      console.log('Using token for order placement:', token ? 'Token available' : 'No token available');
      
      // If we have a token, make sure it's saved to localStorage for future requests
      if (token && !localStorage.getItem('auth_token')) {
        localStorage.setItem('auth_token', token);
        console.log('Saved token to localStorage');
      }
      
      try {
        // Use XMLHttpRequest for order creation
        console.log('Using XMLHttpRequest for order creation...');
        
        const result = await new Promise<OrderResponseData>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const orderApiUrl = import.meta.env.VITE_ORDER_API_URL || `${API_BASE_URL}/orders`;
          xhr.open('POST', orderApiUrl, true);
          xhr.withCredentials = true;
          xhr.setRequestHeader('Content-Type', 'application/json');
          
          // Add Authorization header if token is available
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            console.log('Added Authorization header with token');
          } else {
            console.warn('No token available for Authorization header');
            
            // Last attempt to get token from cookies directly
            const cookieToken = document.cookie
              .split(';')
              .find(cookie => cookie.trim().startsWith('auth_token='))
              ?.split('=')[1];
              
            if (cookieToken) {
              xhr.setRequestHeader('Authorization', `Bearer ${cookieToken}`);
              console.log('Added Authorization header with cookie token');
            } else {
              console.warn('No authentication token available. Order creation may fail.');
            }
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
      
      // If we get here, user is authenticated
      const storedToken = localStorage.getItem('auth_token');
      
      if (!storedToken) {
        console.log('No stored token found despite being authenticated');
        toast.error('Authentication error. Please log in again.');
        setIsProcessing(false);
        onClose();
        navigate('/login', { state: { returnUrl: '/cart' } });
        return;
      }
      
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