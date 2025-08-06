import React, { useState, useEffect } from 'react';
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
  
  // Add orders state and loading - fetch directly from API like MyOrders
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  
  // Function to fetch orders directly from API
  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      console.log('🔍 Bill: Fetching orders from API...');
      
      const response = await apiClient.get('/api/orders/my-orders');
      
      if (response.data) {
        const fetchedOrders = Array.isArray(response.data) ? response.data : [];
        console.log('🔍 Bill: Fetched orders from API:', fetchedOrders.length);
        
        // Debug order data structure for payment issues
        fetchedOrders.forEach((order, index) => {
          console.log(`🔍 Bill Order ${index + 1} debugging:`, {
            id: order.id || order._id,
            orderNumber: order.orderNumber,
            total: order.total,
            subtotal: order.subtotal,
            service_charge: order.service_charge,
            serviceFee: order.serviceFee,
            tip: order.tip,
            paymentStatus: order.paymentStatus,
            status: order.status,
            hasServiceCharge: !!(order.service_charge || order.serviceFee),
            hasTip: !!order.tip
          });
        });
        
        setOrders(fetchedOrders);
      } else {
        console.log('🔍 Bill: No data returned from API');
        setOrders([]);
      }
    } catch (error) {
      console.error('🔍 Bill: Error fetching orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };
  
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

  // Fetch orders when component loads and user is authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchOrders();
    }
  }, [isAuthenticated, isLoading]);

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
          
          // Get user identification for security - Use SAME logic as when creating requests
          const storedUserId = localStorage.getItem('userId');
          const storedDeviceId = localStorage.getItem('deviceId');
          
          // Use consistent identifier priority: localStorage first (matches creation logic)
          const userId = storedUserId || user?.id;
          const deviceId = storedDeviceId || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Store device ID for future use
          if (!storedDeviceId) {
            localStorage.setItem('deviceId', deviceId);
          }
          
          console.log('🔍 Cash Payment Retrieval IDs:', {
            storedUserId,
            storedDeviceId,
            authenticatedUserId: user?.id,
            finalUserId: userId,
            finalDeviceId: deviceId
          });
          
          const response = await cashPaymentService.getCashPaymentRequestsByTable(tableId, userId, deviceId);
          
          if (response.success && response.data) {
            console.log('🔍 CRITICAL DEBUG - Found existing cash payment requests:', response.data);
            const requestsArray = Array.isArray(response.data) ? response.data : [response.data];
            
            // Debug cash payment request structure
            requestsArray.forEach((req, index) => {
              console.log(`🔍 CRITICAL DEBUG - Cash Request ${index}:`, {
                id: req._id || req.id,
                orderIds: req.orderIds,
                orderIdsTypes: req.orderIds?.map(id => ({ id, type: typeof id })),
                totalAmount: req.totalAmount,
                status: req.status,
                fullRequest: req
              });
            });
            
            setExistingCashRequests(requestsArray);
            
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

  // Show loading state while checking authentication, cash requests, or orders
  if (isLoading || isCheckingCashRequest || ordersLoading) {
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
  
  // Filter orders properly for current user and table context
  console.log('🔍 Filtering orders for current session');
  console.log('🔍 Total orders from context:', orders.length);
  
  // Get current session identifiers
  const currentTableId = searchParams.get('table') || localStorage.getItem('currentTableId');
  const currentUserId = user?.id || user?._id;
  const currentDeviceId = localStorage.getItem('deviceId') || localStorage.getItem('device_id');
  
  console.log('🔍 Session context:', {
    currentTableId,
    currentUserId,
    currentDeviceId,
    isAuthenticated
  });
  
  const newOrders = orders.filter(order => {
    console.log('🔍 Processing order for filtering:', {
      orderId: order.id || order._id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      status: order.status,
      orderData: order
    });

    // Only filter out orders that are definitely paid
    const isPaid = order.paymentStatus === 'PAID' || 
                   order.paymentStatus === 'paid' || 
                   order.paymentStatus === 'COMPLETED' || 
                   order.paymentStatus === 'completed';
    
    if (isPaid) {
      console.log('🔍 Order filtered out - paid:', { orderId: order.id, paymentStatus: order.paymentStatus });
      return false;
    }
    
    console.log('🔍 Order is not paid, checking inclusion criteria...', {
      orderId: order.id || order._id,
      paymentStatus: order.paymentStatus,
      status: order.status
    });

    // CRITICAL FIX: Include ALL unpaid orders - both new orders and those with existing cash payment requests
    // This ensures that when a user places a new order, their previous orders still appear
    
    // EMERGENCY FIX: Be more permissive in order matching - the filtering is too strict
    
    // Primary inclusion criteria - authenticated user gets all their unpaid orders
    if (isAuthenticated) {
      // Try multiple ways to match user ID
      const orderUserId = (order as any).userId || order.user?.id || order.user?._id || (order as any).customer?.id;
      const userMatches = orderUserId === currentUserId || 
                         orderUserId === user?.id || 
                         orderUserId === user?._id ||
                         // Fallback: if no user ID on order but user is authenticated, include it
                         (!orderUserId && isAuthenticated);
      
      if (userMatches) {
        console.log('🔍 ✅ CRITICAL: Including unpaid order for authenticated user:', {
          orderId: order.id || order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          currentUserId,
          orderUserId,
          userMatches,
          reason: 'authenticated_user_unpaid_order'
        });
        return true;
      }
    }
    
    // Secondary inclusion criteria - same table context (more permissive)
    const orderTableId = order.tableId || (order as any).table || order.table?.id || (order as any).table_id;
    
    if (currentTableId && (orderTableId === currentTableId || orderTableId === parseInt(currentTableId))) {
      console.log('🔍 Order included - table match:', {
        orderId: order.id,
        orderTableId,
        currentTableId,
        paymentStatus: order.paymentStatus
      });
      return true;
    }
    
    // Tertiary inclusion criteria - same device (for guests)
    const orderDeviceId = (order as any).deviceId || order.device?.id || (order as any).device_id;
    
    if (currentDeviceId && orderDeviceId === currentDeviceId) {
      console.log('🔍 Order included - device match:', {
        orderId: order.id,
        orderDeviceId,
        currentDeviceId
      });
      return true;
    }
    
    // EMERGENCY FALLBACK: If authenticated and we have orders but none match, include recent orders
    if (isAuthenticated && orders.length > 0) {
      const orderAge = new Date().getTime() - new Date((order as any).createdAt || order.timestamp || Date.now()).getTime();
      const isRecentOrder = orderAge < (30 * 60 * 1000); // Last 30 minutes
      
      if (isRecentOrder) {
        console.log('🔍 ✅ EMERGENCY: Including recent order for authenticated user (fallback):', {
          orderId: order.id || order._id,
          orderNumber: order.orderNumber,
          ageMinutes: Math.round(orderAge / (1000 * 60)),
          reason: 'emergency_fallback_recent_order'
        });
        return true;
      }
    }
    
    console.log('🔍 Order filtered out - no match:', { 
      orderId: order.id, 
      orderUserId: (order as any).userId,
      currentUserId,
      orderDeviceId: (order as any).deviceId,
      currentDeviceId,
      orderTableId,
      currentTableId,
      paymentStatus: order.paymentStatus
    });
    return false;
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

  // CRITICAL FIX: Only show orders that DON'T have existing cash payment requests for payment
  // Show existing cash payment requests as informational, but don't allow re-payment
  const allExistingOrderIds = existingCashRequests.flatMap(req => req.orderIds || []);
  const newOrderIds = newOrders.map(order => order.id || order._id);
  
  // Filter out orders that already have cash payment requests - ENHANCED MATCHING
  const ordersWithoutCashRequest = newOrders.filter(order => {
    const orderId = order.id || order._id;
    const orderNumber = order.orderNumber;
    
    // Try multiple matching strategies
    const directIdMatch = allExistingOrderIds.includes(orderId);
    const stringIdMatch = allExistingOrderIds.includes(String(orderId));
    const numberMatch = orderNumber && existingCashRequests.some(req => 
      req.orderIds && req.orderIds.some(id => 
        String(id).includes(orderNumber.replace('#', '').replace('Order ', ''))
      )
    );
    
    // Check if any cash request has this order's amount
    const amountMatch = existingCashRequests.some(req => 
      Math.abs(req.totalAmount - (order.total || 0)) < 0.01
    );
    
    const hasExistingRequest = directIdMatch || stringIdMatch || numberMatch || amountMatch;
    
    console.log(`🔍 CRITICAL DEBUG - ENHANCED Order ${orderId}:`, {
      orderId,
      orderNumber,
      orderTotal: order.total,
      allExistingOrderIds: allExistingOrderIds,
      matchResults: {
        directIdMatch,
        stringIdMatch, 
        numberMatch,
        amountMatch,
        finalResult: hasExistingRequest
      },
      cashRequestTotals: existingCashRequests.map(req => req.totalAmount)
    });
    
    return !hasExistingRequest;
  });
  
  // Orders that already have cash payment requests (for display only)
  const ordersWithCashRequest = newOrders.filter(order => {
    const orderId = order.id || order._id;
    return allExistingOrderIds.includes(orderId);
  });

  // Calculate total from orders WITHOUT existing cash payment requests only
  const subtotal = Number(ordersWithoutCashRequest.reduce((sum, order) => sum + order.subtotal, 0).toFixed(2));
  
  // Get service charges from orders without existing cash requests
  const serviceChargeFromOrders = Number(ordersWithoutCashRequest.reduce((sum, order) => {
    // Check multiple possible fields for service charge
    const orderServiceCharge = (order as any).service_charge || 
                              (order as any).serviceFee || 
                              (order as any).serviceCharge || 0;
    return sum + orderServiceCharge;
  }, 0).toFixed(2));
  
  // Get tips from orders without existing cash requests
  const tipFromOrders = Number(ordersWithoutCashRequest.reduce((sum, order) => {
    const orderTip = (order as any).tip || 0;
    return sum + orderTip;
  }, 0).toFixed(2));
  
  // Fallback to restaurant percentage if orders don't have service charge
  const serviceCharge = serviceChargeFromOrders > 0 
    ? serviceChargeFromOrders
    : (restaurantServiceCharge.enabled ? Number((subtotal * (restaurantServiceCharge.percentage / 100)).toFixed(2)) : 0);
  
  // Calculate total with proper precision
  const total = Number((subtotal + serviceCharge + tipFromOrders).toFixed(2));
  
  // Get the most recent pending cash payment request
  const mostRecentPendingRequest = existingCashRequests
    .filter(req => req.status === 'PENDING')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  console.log('🔍 Bill display logic:', {
    newOrdersCount: newOrders.length,
    newOrderIds: newOrders.map(o => o.id || o._id),
    hasPendingRequest: !!mostRecentPendingRequest,
    pendingRequestAmount: mostRecentPendingRequest?.totalAmount,
    forceBillView,
    willShowPendingScreen: newOrders.length === 0 && mostRecentPendingRequest && !forceBillView,
    willShowPaymentOptions: newOrders.length > 0,
    calculatedTotal: total,
    subtotal,
    serviceCharge,
    tipFromOrders
  });
  
  console.log('🔍 Cash payment request analysis:', {
    newOrdersCount: newOrders.length,
    newOrderIds: newOrderIds,
    allExistingOrderIds: allExistingOrderIds,
    ordersWithoutCashRequest: ordersWithoutCashRequest.length,
    ordersWithoutCashRequestIds: ordersWithoutCashRequest.map(o => o.id || o._id),
    ordersWithCashRequest: ordersWithCashRequest.length,
    ordersWithCashRequestIds: ordersWithCashRequest.map(o => o.id || o._id),
    note: 'CORRECTED: Only showing payment options for orders WITHOUT existing cash payment requests'
  });

  // Decision: Show pending screen if NO new orders without cash requests
  const shouldShowPendingScreen = (
    ordersWithoutCashRequest.length === 0 && 
    mostRecentPendingRequest && 
    !forceBillView
  );
  
  // Show main bill UI only if there are orders that need payment (no existing cash requests)
  const shouldShowMainBillUI = ordersWithoutCashRequest.length > 0;
  
  console.log('🔍 ✅ CRITICAL: Bill display decision:', {
    shouldShowPendingScreen,
    shouldShowMainBillUI,
    newOrdersCount: newOrders.length,
    ordersWithoutCashRequestCount: ordersWithoutCashRequest.length,
    hasPendingRequest: !!mostRecentPendingRequest,
    forceBillView,
    total: total,
    logic: shouldShowPendingScreen ? 'SHOW_PENDING_SCREEN' : (shouldShowMainBillUI ? 'SHOW_MAIN_BILL_UI' : 'SHOW_NO_ORDERS')
  });
  // Show pending screen if:
  // 1. No new orders at all AND there's a pending request, OR
  // 2. All orders have cash payment requests (no orders without cash requests) AND there's a pending request
  // (unless forced to show bill)
  if (shouldShowPendingScreen) {
    console.log('🔍 Showing pending screen - no orders but pending cash request');
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
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // TEMPORARY DEBUG: Show all order data if filtering fails
  if (newOrders.length === 0 && orders.length > 0) {
    console.log('🚨 CRITICAL DEBUG: No orders after filtering but we have orders from API:', {
      originalOrdersCount: orders.length,
      filteredOrdersCount: newOrders.length,
      firstOrderData: orders[0],
      sessionContext: { currentTableId, currentUserId, isAuthenticated },
      allOrderData: orders.map(o => ({
        id: o.id || o._id,
        orderNumber: o.orderNumber,
        paymentStatus: o.paymentStatus,
        status: o.status,
        tableId: o.tableId,
        userId: (o as any).userId
      }))
    });
  }

  // Show "no orders" screen if there are no new orders and no pending requests (all collected) and not forced to show bill
  const hasActivePendingRequests = existingCashRequests.some(req => req.status === 'PENDING');
  if (newOrders.length === 0 && !hasActivePendingRequests && !forceBillView) {
    console.log('🔍 Showing no orders screen - truly no orders or pending requests');
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

          // Get order IDs for the payment request (only orders without existing cash requests)
          const orderIds = ordersWithoutCashRequest.map(order => order.id || (order as any)._id).filter(id => id);
          
          if (orderIds.length === 0) {
            throw new Error('No new orders to request payment for - all orders already have cash payment requests.');
          }

          // Create cash payment request - Use consistent ID logic
          const storedUserId = localStorage.getItem('userId');
          const storedDeviceId = localStorage.getItem('deviceId');
          
          // Use same priority as retrieval logic
          const userId = storedUserId || user?.id;
          const deviceId = storedDeviceId || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Store device ID if not already stored
          if (!storedDeviceId) {
            localStorage.setItem('deviceId', deviceId);
          }
          
          const requestData = {
            tableId,
            totalAmount: total,
            orderIds,
            additionalInfo: `Table ${tableNumber} - Cash payment request`,
            userId: userId,
            deviceId: deviceId,
            isGuest: !isAuthenticated
          };

          console.log('🔍 Cash Payment Creation IDs:', {
            storedUserId,
            storedDeviceId,
            authenticatedUserId: user?.id,
            finalUserId: userId,
            finalDeviceId: deviceId
          });
          
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
        
        // Get the items from orders without existing cash requests only for Stripe checkout
        const allItems = [];
        ordersWithoutCashRequest.forEach(order => {
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

        
        // Add service charge as a separate line item with proper validation
        if (serviceCharge > 0) {
          const serviceChargeAmount = Math.round(serviceCharge * 100); // Convert to cents
          
          // Validate service charge amount
          if (Number.isInteger(serviceChargeAmount) && serviceChargeAmount > 0) {
            lineItems.push({
              price_data: {
                currency: 'usd',
                product_data: {
                  name: serviceChargeFromOrders > 0 ? 'Service Charge' : `Service Charge (${restaurantServiceCharge.percentage}%)`,
                  description: 'Service charge applied to order',
                  images: []
                },
                unit_amount: serviceChargeAmount
              },
              quantity: 1
            });
          } else {
            console.warn('Invalid service charge amount for Stripe:', serviceCharge, 'cents:', serviceChargeAmount);
          }
        }

        // Add tips as a separate line item if present
        if (tipFromOrders > 0) {
          const tipAmount = Math.round(tipFromOrders * 100); // Convert to cents
          
          // Validate tip amount
          if (Number.isInteger(tipAmount) && tipAmount > 0) {
            lineItems.push({
              price_data: {
                currency: 'usd',
                product_data: {
                  name: 'Tips',
                  description: 'Tips included in order',
                  images: []
                },
                unit_amount: tipAmount
              },
              quantity: 1
            });
          } else {
            console.warn('Invalid tip amount for Stripe:', tipFromOrders, 'cents:', tipAmount);
          }
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
          cancelUrl: `${window.location.origin}/payment/cancel?table=${tableId || ''}&return_from_stripe=true`
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

  // MAIN BILL UI - Only show when there are orders without cash payment requests
  if (!shouldShowMainBillUI) {
    console.log('🔍 ⚠️ CRITICAL: Not showing main bill UI - all orders have cash payment requests or no orders');
    // This shouldn't happen if our logic is correct, but just in case
    return (
      <div className="min-h-screen bg-[#16141F] text-white">
        <TableHeader 
          venueName={restaurantName || 'Restaurant'}
          className="bg-[#16141F] text-white"
        />
        <div className="px-4 py-8 mt-16 text-center">
          <p className="text-gray-400">No orders available for payment.</p>
          <Button
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => window.location.href = '/'}
          >
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }
  
  console.log('🔍 ✅ RENDERING MAIN BILL UI with payment options:', {
    newOrdersCount: newOrders.length,
    ordersWithoutCashRequestCount: ordersWithoutCashRequest.length,
    total: total,
    serviceCharge: serviceCharge,
    tipFromOrders: tipFromOrders,
    existingCashRequestsCount: existingCashRequests.length
  });

  return (
    <div className="min-h-screen bg-[#16141F] text-white">
      {/* Use the same TableHeader as the menu page */}
      <TableHeader 
        venueName={restaurantName || 'Screen 3'}
        className="bg-[#16141F] text-white"
      />
      
      <div className="px-4 py-4 mt-16">
        <h1 className="text-2xl font-semibold mb-6">Your Bill</h1>
      
        {/* Show consolidated order details - single bill format */}
        {ordersWithoutCashRequest.length > 0 && (
          <div className="bg-[#262837] border border-[#2D303E] rounded-lg p-4 mb-6">
            <div className="text-center mb-4">
              <h2 className="font-bold text-xl">{restaurantName || 'Screen 3'}</h2>
              <p className="text-sm text-gray-400">Table {tableNumber}</p>
              <p className="text-sm text-gray-400">{format(new Date(), 'MMM d, yyyy h:mm a')}</p>
            </div>
            
            <div className="border-t border-b border-[#2D303E] py-4 my-4">
              {ordersWithoutCashRequest.map((order, orderIndex) => (
                <div key={orderIndex} className="mb-4 last:mb-0">
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
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              {serviceCharge > 0 && (
                <div className="flex justify-between">
                  <span>Service Charge {restaurantServiceCharge.enabled ? `(${restaurantServiceCharge.percentage}%)` : ''}</span>
                  <span>${serviceCharge.toFixed(2)}</span>
                </div>
              )}
              
              {tipFromOrders > 0 && (
                <div className="flex justify-between">
                  <span>Tips</span>
                  <span>${tipFromOrders.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-[#2D303E]">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
        
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
        
        {/* Payment method selection - only show if there are orders to pay for */}
        {ordersWithoutCashRequest.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Select Payment Method</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                className={`flex items-center justify-center h-16 ${
                  paymentMethod === 'card' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' 
                    : 'bg-transparent hover:bg-[#2D303E] text-gray-300 border-[#2D303E]'
                }`}
                onClick={() => setPaymentMethod('card')}
              >
                <CreditCard className="h-6 w-6 mr-2" />
                Card
              </Button>
              
              <Button
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                className={`flex items-center justify-center h-16 ${
                  paymentMethod === 'cash' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' 
                    : 'bg-transparent hover:bg-[#2D303E] text-gray-300 border-[#2D303E]'
                }`}
                onClick={() => setPaymentMethod('cash')}
              >
                <Banknote className="h-6 w-6 mr-2" />
                Cash
              </Button>
            </div>
            
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              onClick={handlePayment}
              disabled={!paymentMethod || isPaying}
            >
              {isPaying ? 'Processing...' : `Pay $${total.toFixed(2)}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bill;
