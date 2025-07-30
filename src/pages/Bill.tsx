import React, { useState, useEffect } from 'react';
import { useOrders } from '@/context/OrdersContext';
import { Button } from '@/components/ui/button';
import { CreditCard, Banknote, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTableInfo } from '@/context/TableContext';
import { format } from 'date-fns';
import TableHeader from '@/components/TableHeader';
import * as paymentService from '@/api/paymentService';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '@/api/apiClient';
// Removed unused import: updatePaymentStatus
import * as cashPaymentService from '@/api/cashPaymentService';

const Bill: React.FC = () => {
  const { orders, clearOrders } = useOrders();
  const { tableNumber, restaurantName } = useTableInfo();
  const { isAuthenticated, isLoading, token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [cashPaymentRequest, setCashPaymentRequest] = useState<any>(null);
  const [showCashPending, setShowCashPending] = useState(false);
  const [existingCashRequests, setExistingCashRequests] = useState<any[]>([]);
  const [isCheckingCashRequest, setIsCheckingCashRequest] = useState(true);
  const [forceBillView, setForceBillView] = useState(false);
  const [restaurantServiceCharge, setRestaurantServiceCharge] = useState({ enabled: false, percentage: 0 });
  
  // Early authentication check - redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Check for any auth tokens or user data
      const hasToken = token || localStorage.getItem('access_token') || document.cookie.includes('access_token');
      const hasUserData = localStorage.getItem('user');
      
      if (!hasToken && !hasUserData) {
        console.log('User not authenticated, redirecting to login');
        navigate('/login', { 
          state: { 
            returnUrl: `/bill${window.location.search}`,
            message: 'Please log in to view your bill'
          } 
        });
        return;
      }
    }
  }, [isAuthenticated, isLoading, token, navigate]);

  // Check for existing cash payment requests on component load
  useEffect(() => {
    const checkExistingCashRequest = async () => {
      try {
        // Get table ID from URL parameter first, then fallback to localStorage
        const urlTableId = searchParams.get('table');
        const storageTableId = localStorage.getItem('currentTableId') || 
                              localStorage.getItem('table_id') || 
                              localStorage.getItem('tableId');
        
        const tableId = urlTableId || storageTableId;
        
        if (tableId) {
          console.log('Checking for existing cash payment request for table:', tableId);
          
          // Get user identification for security
          const userId = user?.id || localStorage.getItem('userId');
          const deviceId = localStorage.getItem('deviceId') || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Store device ID for future use
          if (!localStorage.getItem('deviceId')) {
            localStorage.setItem('deviceId', deviceId);
          }
          
          const response = await cashPaymentService.getCashPaymentRequestsByTable(tableId, userId, deviceId);
          
          if (response.success && response.data) {
            console.log('Found existing cash payment requests:', response.data);
            setExistingCashRequests(Array.isArray(response.data) ? response.data : [response.data]);
            
            // Don't automatically show pending screen here - let the filtering logic decide
            // The pending screen will be shown later if there are no new orders
          }
        }
      } catch (error) {
        console.log('No existing cash payment request found:', error);
      } finally {
        setIsCheckingCashRequest(false);
      }
    };

    if (isAuthenticated && !isLoading) {
      checkExistingCashRequest();
    }
  }, [isAuthenticated, isLoading, searchParams]);

  // Fetch restaurant service charge settings
  useEffect(() => {
    const fetchRestaurantServiceCharge = async () => {
      try {
        const restaurantId = localStorage.getItem('restaurantId');
        if (restaurantId) {
          const response = await apiClient.get(`/api/restaurants/${restaurantId}/service-charge`);
          if (response.data.service_charge) {
            setRestaurantServiceCharge(response.data.service_charge);
          }
        }
      } catch (error) {
        console.log('Could not fetch restaurant service charge settings:', error);
        // Keep default values (disabled)
      }
    };

    if (isAuthenticated && !isLoading) {
      fetchRestaurantServiceCharge();
    }
  }, [isAuthenticated, isLoading]);

  // Show loading state while checking authentication or cash requests
  if (isLoading || isCheckingCashRequest) {
    return (
      <div className="min-h-screen bg-[#16141F] text-white">
        <TableHeader 
          venueName={restaurantName || 'Restaurant'}
          className="bg-[#16141F] text-white"
        />
        <div className="px-4 py-8 mt-16">
          <div className="text-center py-16">
            <p className="text-gray-400">{isCheckingCashRequest ? 'Checking for existing payment requests...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated after loading is complete, don't render the component (redirect will happen)
  if (!isAuthenticated && !token && !localStorage.getItem('access_token') && !document.cookie.includes('access_token')) {
    return null;
  }
  
  // TEMPORARILY SHOW ALL ORDERS FOR DEBUGGING - Remove filtering entirely
  console.log('🔍 DEBUGGING: Total orders from context:', orders.length);
  console.log('🔍 DEBUGGING: All orders:', orders.map(o => ({
    id: o.id,
    paymentStatus: o.paymentStatus,
    status: o.status,
    createdAt: (o as any).createdAt || o.timestamp,
    tableId: o.tableId || (o as any).table
  })));
  
  // For debugging: Show ALL orders that aren't explicitly marked as PAID
  const newOrders = orders.filter(order => {
    // Only filter out orders that are definitely paid
    const isPaid = order.paymentStatus === 'PAID' || 
                   order.paymentStatus === 'paid' || 
                   order.paymentStatus === 'COMPLETED' || 
                   order.paymentStatus === 'completed';
    
    if (isPaid) {
      console.log('🔍 Order filtered out - paid:', { orderId: order.id, paymentStatus: order.paymentStatus });
      return false;
    }
    
    console.log('🔍 Order included:', { 
      orderId: order.id, 
      paymentStatus: order.paymentStatus,
      status: order.status 
    });
    return true; // Include all non-paid orders
  });
  console.log('🔍 DEBUGGING: Filtered orders count:', newOrders.length);

  console.log('🔍 Orders filtering debug:', {
    sessionContext: {
      currentTableId: searchParams.get('table') || localStorage.getItem('currentTableId'),
      currentUserId: user?.id,
      currentDeviceId: localStorage.getItem('device_id'),
      isAuthenticated
    },
    allOrders: orders.length,
    allOrderIds: orders.map(o => ({ 
      id: o.id || o._id, 
      number: o.orderNumber,
      tableId: o.tableId || (o as any).table,
      userId: (o as any).userId,
      deviceId: (o as any).deviceId,
      age: Math.round((new Date().getTime() - new Date((o as any).createdAt || o.timestamp).getTime()) / (1000 * 60)) + ' minutes'
    })),
    existingCashRequests: existingCashRequests,
    existingCashRequestsCount: existingCashRequests.length,
    allExistingOrderIds: existingCashRequests.flatMap(req => req.orderIds || []),
    newOrders: newOrders.length,
    filteredOrderIds: newOrders.map(o => ({ 
      id: o.id || o._id, 
      number: o.orderNumber,
      tableId: o.tableId || (o as any).table,
      userId: (o as any).userId,
      deviceId: (o as any).deviceId 
    }))
  });

  // Calculate total from new orders only
  const subtotal = newOrders.reduce((sum, order) => sum + order.subtotal, 0);
  const serviceChargeFromOrders = newOrders.reduce((sum, order) => sum + ((order as any).service_charge || 0), 0);
  // Fallback to restaurant percentage if orders don't have service charge
  const serviceCharge = serviceChargeFromOrders > 0 
    ? serviceChargeFromOrders
    : (restaurantServiceCharge.enabled ? subtotal * (restaurantServiceCharge.percentage / 100) : 0);
  const total = subtotal + serviceCharge;
  
  // Get the most recent pending cash payment request
  const mostRecentPendingRequest = existingCashRequests
    .filter(req => req.status === 'PENDING')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // Show pending screen if there are no new orders and there's a pending request (unless forced to show bill)
  if (newOrders.length === 0 && mostRecentPendingRequest && !forceBillView) {
    return (
      <div className="min-h-screen bg-[#16141F] text-white">
        <TableHeader 
          venueName={restaurantName || 'Restaurant'}
          className="bg-[#16141F] text-white"
        />
        <div className="px-4 py-8 mt-16">
          <div className="text-center py-16">
            <div className="bg-yellow-600 rounded-full p-4 w-16 h-16 mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-4">Cash Payment Requested</h1>
            <p className="text-gray-400 mb-2">Your bill total is ${mostRecentPendingRequest.totalAmount}</p>
            <p className="text-sm text-gray-500 mb-8">
              A waiter will come to your table shortly to collect the cash payment. Please have the exact amount ready or they will provide change.
            </p>
            <div className="space-y-4">
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  const tableId = searchParams.get('table') || localStorage.getItem('tableContext');
                  if (tableId) {
                    navigate(`/my-orders?table=${tableId}`);
                  } else {
                    navigate('/my-orders');
                  }
                }}
              >
                View My Orders
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                onClick={() => {
                  // Force showing the bill view with all cash payment requests
                  setForceBillView(true);
                }}
              >
                Back to Bill
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show "no orders" screen if there are no new orders and no pending requests (all collected) and not forced to show bill
  const hasActivePendingRequests = existingCashRequests.some(req => req.status === 'PENDING');
  if (newOrders.length === 0 && !hasActivePendingRequests && !forceBillView) {
    return (
      <div className="min-h-screen bg-[#16141F] text-white">
        {/* Use the same TableHeader as the menu page */}
        <TableHeader 
          venueName={restaurantName || 'Screen 3'}
          className="bg-[#16141F] text-white"
        />
        
        <div className="px-4 py-8 mt-16">
          <h1 className="text-2xl font-semibold mb-6">Your Bill</h1>
          
          <div className="text-center py-12">
            <p className="text-gray-400 mb-2">You don't have any orders to pay for in this session</p>
            <p className="text-sm text-gray-500 mb-6">Only orders from your current table session will appear here</p>
            
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => window.location.href = '/'}
            >
              Browse Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  const handlePayment = async () => {
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    
    setIsPaying(true);
    
    try {
      // Handle cash payments - create cash payment request
      if (paymentMethod === 'cash') {
        try {
          // Get table ID from URL parameter first, then fallback to localStorage
          const urlTableId = searchParams.get('table');
          const storageTableId = localStorage.getItem('currentTableId') || 
                                localStorage.getItem('table_id') || 
                                localStorage.getItem('tableId');
          
          const tableId = urlTableId || storageTableId;
          
          console.log('Table ID sources:', {
            urlTableId,
            storageTableId,
            finalTableId: tableId,
            currentUrl: window.location.href
          });
          
          if (!tableId) {
            throw new Error('Table ID not found in URL or localStorage. Please scan QR code again.');
          }

          // Get order IDs for the payment request (only new orders, not already requested)
          const orderIds = newOrders.map(order => order.id || (order as any)._id).filter(id => id);
          
          if (orderIds.length === 0) {
            throw new Error('No new orders to request payment for.');
          }

          // Create cash payment request
          const requestData = {
            tableId,
            totalAmount: total,
            orderIds,
            additionalInfo: `Table ${tableNumber} - Cash payment request`,
            userId: localStorage.getItem('userId') || undefined,
            deviceId: localStorage.getItem('deviceId') || undefined,
            isGuest: !isAuthenticated
          };

          console.log('Creating cash payment request:', requestData);

          const response = await cashPaymentService.createCashPaymentRequest(requestData);

          if (response.success) {
            setCashPaymentRequest(response.data);
            setShowCashPending(true);
            toast.success('Cash payment requested! A waiter will come to collect payment.');
          } else {
            throw new Error(response.message || 'Failed to create cash payment request');
          }
        } catch (error: any) {
          console.error('Cash payment request error:', error);
          toast.error('Failed to request cash payment. Please try again.');
          setIsPaying(false);
          return;
        }
      }

      // For card payments, use the same Stripe checkout flow as MyOrders
      if (paymentMethod === 'card') {
        // Get table ID from URL parameter first, then fallback to localStorage
        const urlTableId = searchParams.get('table');
        const storageTableId = localStorage.getItem('currentTableId') || 
                              localStorage.getItem('table_id') || 
                              localStorage.getItem('tableId');
        
        const tableId = urlTableId || storageTableId;
        const restaurantId = localStorage.getItem('restaurantId') || 
                             localStorage.getItem('restaurant_id');
        
        // Get the items from new orders only for Stripe checkout
        const allItems = [];
        newOrders.forEach(order => {
          if (order.items) {
            order.items.forEach(item => {
              allItems.push({
                id: item.id || (item as any)._id || '',
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                modifiers: item.modifiers || [],
                specialInstructions: item.specialInstructions || ''
              });
            });
          }
        });

        // Format line items for Stripe - same as MyOrders implementation
        const lineItems = allItems.map(item => {
          // Calculate the total price including modifiers
          const modifierPrice = item.modifiers 
            ? item.modifiers.reduce((sum, mod) => sum + mod.price, 0) 
            : 0;
          
          const totalItemPrice = (item.price + modifierPrice) * 100; // Convert to cents for Stripe
          
          // Format description including modifiers
          let description = item.name;
          if (item.modifiers && item.modifiers.length > 0) {
            const modifierNames = item.modifiers.map(mod => mod.name).join(', ');
            description += ` with ${modifierNames}`;
          }
          if (item.specialInstructions) {
            description += `. Note: ${item.specialInstructions}`;
          }
          
          return {
            price_data: {
              currency: 'usd',
              product_data: {
                name: item.name,
                description: description,
                images: item.image ? [item.image] : undefined
              },
              unit_amount: totalItemPrice // Amount in cents
            },
            quantity: item.quantity
          };
        });

        
        // Add service charge as a separate line item
        if (restaurantServiceCharge.enabled && serviceCharge > 0) {
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Service Charge (${restaurantServiceCharge.percentage}%)`,
                description: 'Service charge applied to order',
                images: []
              },
              unit_amount: Math.round(serviceCharge * 100) // Convert to cents
            },
            quantity: 1
          });
        }

        console.log('Creating checkout session with:', {
          lineItems: lineItems.length,
          tableId,
          restaurantId
        });
        
        // Use apiClient instead of fetch to create Stripe checkout session
        const response = await apiClient.post('/api/payments/create-checkout-session', {
          lineItems,
          tableId: tableId || '',
          restaurantId: restaurantId || '',
          successUrl: `${window.location.origin}/payment/success`,
          cancelUrl: `${window.location.origin}/payment/cancel`
        });

        if (!response.data.success) {
          throw new Error(response.data.error?.message || 'Failed to create payment session');
        }

        // Store the session information
        if (response.data.sessionId) {
          localStorage.setItem('stripeSessionId', response.data.sessionId);
        }

        // Redirect to Stripe checkout
        if (response.data.url) {
          window.location.href = response.data.url;
        } else {
          throw new Error('No checkout URL received');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      setIsPaying(false);
    }
  };

  // Show cash payment pending UI
  if (showCashPending) {
    return (
      <div className="min-h-screen bg-[#16141F] text-white">
        <TableHeader 
          venueName={restaurantName || 'Screen 3'}
          className="bg-[#16141F] text-white"
        />
        
        <div className="px-4 py-8 mt-16 text-center">
          <div className="w-16 h-16 bg-yellow-900 rounded-full mx-auto flex items-center justify-center mb-4">
            <Banknote className="h-8 w-8 text-yellow-400" />
          </div>
          
          <h1 className="text-2xl font-semibold mb-2">Cash Payment Requested</h1>
          
          <p className="text-gray-400 mb-4">
            Your bill total is <span className="text-white font-semibold">${total.toFixed(2)}</span>
          </p>
          
          <p className="text-gray-400 mb-8">
            A waiter will come to your table shortly to collect the cash payment. 
            Please have the exact amount ready or they will provide change.
          </p>
          
          <div className="flex flex-col gap-3">
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => navigate('/my-orders')}
            >
              View My Orders
            </Button>
            
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              onClick={() => {
                setShowCashPending(false);
                setCashPaymentRequest(null);
                setPaymentMethod(null);
                setIsPaying(false);
              }}
            >
              Back to Bill
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen bg-[#16141F] text-white">
        {/* Use the same TableHeader as the menu page */}
        <TableHeader 
          venueName={restaurantName || 'Screen 3'}
          className="bg-[#16141F] text-white"
        />
        
        <div className="px-4 py-8 mt-16 text-center">
          <div className="w-16 h-16 bg-green-900 rounded-full mx-auto flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-green-400" />
          </div>
          
          <h1 className="text-2xl font-semibold mb-2">Payment Complete!</h1>
          
          <p className="text-gray-400 mb-8">
            Thank you for dining with us. We hope to see you again soon!
          </p>
          
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => window.location.href = '/'}
          >
            Return to Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16141F] text-white">
      {/* Use the same TableHeader as the menu page */}
      <TableHeader 
        venueName={restaurantName || 'Screen 3'}
        className="bg-[#16141F] text-white"
      />
      
      <div className="px-4 py-4 mt-16">
        <h1 className="text-2xl font-semibold mb-6">Your Bill</h1>
      
        <div className="bg-[#262837] border border-[#2D303E] rounded-lg p-4 mb-6">
          <div className="text-center mb-4">
            <h2 className="font-bold text-xl">{restaurantName || 'Screen 3'}</h2>
            <p className="text-sm text-gray-400">Table {tableNumber}</p>
            <p className="text-sm text-gray-400">{format(new Date(), 'MMM d, yyyy h:mm a')}</p>
          </div>
          
          <div className="border-t border-b border-[#2D303E] py-4 my-4">
            {newOrders.map((order, index) => (
              <div key={index} className="mb-4">
                <h3 className="font-medium text-sm mb-2">Order #{order.id && order.id.includes('-') ? order.id.split('-')[1] : (order.orderNumber || order.id?.substring(0,6) || 'New')}</h3>
                
                {order.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex justify-between text-sm py-1">
                    <span>{item.quantity} x {item.name}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            
            {(serviceCharge > 0 || restaurantServiceCharge.enabled) && (
              <div className="flex justify-between">
                <span>Service Charge {restaurantServiceCharge.enabled ? `(${restaurantServiceCharge.percentage}%)` : ''}</span>
                <span>${serviceCharge.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-[#2D303E]">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Show all existing cash payment requests */}
        {existingCashRequests.length > 0 && existingCashRequests.some(req => req.status !== 'COLLECTED') && (
          <div className="space-y-4 mb-6">
            {existingCashRequests
              .filter(req => req.status !== 'COLLECTED')
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((cashRequest, index) => (
                <div key={cashRequest._id || index} className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Banknote className="h-5 w-5 text-yellow-400 mr-2" />
                    <h3 className="font-medium text-yellow-200">
                      {existingCashRequests.filter(req => req.status !== 'COLLECTED').length > 1 
                        ? `Cash Payment Request #${existingCashRequests.filter(req => req.status !== 'COLLECTED').length - index}`
                        : 'Previous Cash Payment Request'
                      }
                    </h3>
                  </div>
                  
                  <div className="text-sm text-gray-300 space-y-2">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="text-white font-medium">${cashRequest.totalAmount?.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-medium ${
                        cashRequest.status === 'PENDING' ? 'text-yellow-400' : 
                        cashRequest.status === 'COLLECTED' ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {cashRequest.status}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Requested:</span>
                      <span>{new Date(cashRequest.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {cashRequest.status === 'PENDING' && (
                    <div className="mt-3 pt-3 border-t border-yellow-700/30">
                      <p className="text-sm text-yellow-200">
                        ⏳ A waiter will come to collect this payment shortly
                      </p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
        
        <div className="mb-8">
          <h2 className="font-medium mb-4">Select Payment Method{existingCashRequests.length > 0 ? ' for Current Session Orders' : ''}</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={paymentMethod === 'card' ? 'default' : 'outline'}
              className={`h-20 flex flex-col ${
                paymentMethod === 'card' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-[#2D303E] text-white'
              }`}
              onClick={() => setPaymentMethod('card')}
            >
              <CreditCard className="h-6 w-6 mb-2" />
              <span>Card</span>
            </Button>
            
            <Button
              variant={paymentMethod === 'cash' ? 'default' : 'outline'}
              className={`h-20 flex flex-col ${
                paymentMethod === 'cash' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-[#2D303E] text-white'
              }`}
              onClick={() => setPaymentMethod('cash')}
            >
              <Banknote className="h-6 w-6 mb-2" />
              <span>Cash</span>
            </Button>
          </div>
        </div>
        
        <Button
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"
          onClick={handlePayment}
          disabled={isPaying}
        >
          {isPaying ? (
            <>
              <span className="animate-spin mr-2">⭕</span> Processing...
            </>
          ) : (
            <>{paymentMethod === 'cash' ? 'Get Bill' : `Pay $${total.toFixed(2)}`}</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Bill;
