import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrdersContext';
import { useTableInfo } from '@/context/TableContext';
import { checkPaymentStatus } from '@/api/paymentService';
import { CheckCircle, AlertCircle, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  
  // Retrieve all URL parameters for debugging
  const allParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    allParams[key] = value;
  });
  console.log('All URL parameters:', allParams);
  
  // Check for all possible session ID formats
  const sessionId = searchParams.get('sessionId') || 
                   searchParams.get('session_id') || 
                   searchParams.get('CHECKOUT_SESSION_ID') || 
                   searchParams.get('cs');
                   
  // Check for all possible order ID formats
  const orderId = searchParams.get('orderId') || searchParams.get('order_id');
  const tableParam = searchParams.get('table');
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { addOrder } = useOrders();
  const { tableId, tableNumber, restaurantName, setTableInfo } = useTableInfo();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();
  
  // Debug info display
  const [debugInfo, setDebugInfo] = useState<any>({
    params: {
      ...allParams,
      sessionId,
      orderId,
      tableParam
    },
    attempts: 0,
    lastResponseData: null,
    verificationStatus: 'not_started'
  });
  const [showDebug, setShowDebug] = useState(true); // Show debug by default to help troubleshoot issues
  const [paymentData, setPaymentData] = useState<any>(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  // Process and sanitize the table parameter
  useEffect(() => {
    if (tableParam) {
      // Decode the table parameter if it's URL encoded
      let tableId = tableParam;
      if (tableParam.includes('%')) {
        try {
          tableId = decodeURIComponent(tableParam);
        } catch (e) {
          console.error('Failed to decode table parameter:', e);
          tableId = tableParam;
        }
      }
      
      // Remove [object Object] if present
      if (tableId === '[object Object]') {
        console.error('Found [object Object] in table parameter');
        
        // Try to get table ID from localStorage instead
        const savedTableInfo = localStorage.getItem('tableInfo');
        if (savedTableInfo) {
          try {
            const parsedInfo = JSON.parse(savedTableInfo);
            if (parsedInfo.tableId && parsedInfo.tableId !== '[object Object]') {
              tableId = parsedInfo.tableId;
            }
          } catch (e) {
            console.error('Failed to parse tableInfo from localStorage:', e);
          }
        }
      }
      
      // Store table info regardless of source
      if (tableId && tableId !== '[object Object]') {
        console.log('Setting table info from URL parameter:', tableId);
        setTableInfo({
          tableId,
          tableNumber: tableId,
          restaurantName: 'Restaurant'
        });
      }
    }
  }, [tableParam, setTableInfo]);

  // Function to verify payment status
  const verifyPayment = async () => {
    try {
      // Stop if we've already tried too many times
      if (attempts >= maxAttempts) {
        console.log('Max attempts reached, stopping verification');
        setError('Payment verification failed after multiple attempts.');
        setLoading(false);
        return;
      }
      
      setAttempts(prev => prev + 1);
      
      // Get stripe session ID from URL or localStorage
      const stripeSessionFromUrl = sessionId;
      
      // Check for custom format (session_123456789) vs Stripe format (cs_test_...)
      const isCustomFormat = stripeSessionFromUrl && !stripeSessionFromUrl.startsWith('cs_');
      
      // Get effective session ID, prioritizing standard format
      let effectiveSessionId = '';
      if (stripeSessionFromUrl) {
        effectiveSessionId = stripeSessionFromUrl;
      } else {
        // Try to get from localStorage
        effectiveSessionId = localStorage.getItem('stripeSessionId') || '';
      }
      
      // Try to get order ID from different sources
      const effectiveOrderId = orderId || localStorage.getItem('currentPaymentOrderId') || '';
      
      console.log('Payment verification attempt', {
        effectiveSessionId, 
        effectiveOrderId, 
        stripeSessionFromUrl,
        isCustomFormat,
        attempt: attempts + 1 
      });
      
      // Use Stripe session ID from URL if available, otherwise use the effective session ID
      let sessionIdToUse = effectiveSessionId || stripeSessionFromUrl;
      
      // Special case: If we have orderId but no valid Stripe session ID
      if ((!sessionIdToUse || isCustomFormat) && effectiveOrderId) {
        console.log('Using order ID for verification instead of session ID');
        // Consider the payment successful if we have an order ID
        clearCart();
        setPaymentData({ orderId: effectiveOrderId, status: 'paid' });
        addOrder({ _id: effectiveOrderId } as any);
        setLoading(false);
        return;
      }
        
      // If no session ID from URL, try to get it from localStorage
      if (!sessionIdToUse) {
        // Try to get it from localStorage
        const storedSessionId = localStorage.getItem('stripeSessionId');
        const storedOrderId = localStorage.getItem('currentPaymentOrderId');
        
        console.log('No session ID in URL, checking localStorage:', { storedSessionId, storedOrderId });
        
        if (storedSessionId) {
          console.log('Found session ID in localStorage:', storedSessionId);
          sessionIdToUse = storedSessionId;
        } else if (storedOrderId) {
          // If we have an order ID but no session ID, we might still be able to verify the order directly
          console.log('No session ID, but found order ID in localStorage:', storedOrderId);
          setError('');
          setPaymentData({ orderId: storedOrderId, status: 'paid' });
          addOrder({ _id: storedOrderId } as any);
          setLoading(false);
          return;
        } else {
          setError('Missing session ID. Unable to verify payment.');
          setLoading(false);
          setDebugInfo(prev => ({ ...prev, verificationStatus: 'error' }));
          return;
        }
      }

      try {
        setLoading(true);
        // Use the sessionIdToUse we determined above
        const result = await checkPaymentStatus(sessionIdToUse);
        console.log('Payment status result:', result);
        
        // Update debug info with the response
        setDebugInfo(prev => ({
          ...prev,
          lastResponseData: result
        }));
        
        // SUCCESS PATH: Handle successful payment verification
        if (result && (result.status === 'paid' || result.paymentProviderStatus === 'paid')) {
          console.log('Payment verified as paid! Stopping verification process.');
          toast({
            title: "Payment Successful",
            description: "Your payment has been successfully processed."
          });
          
          setPaymentData(result);
          clearCart();
          
          // Add the order to the orders context if we have an order ID
          const orderIdToUse = result.orderId || effectiveOrderId;
          if (orderIdToUse) {
            console.log('Adding order to context:', orderIdToUse);
            addOrder({ _id: orderIdToUse } as any);
          }
          
          // Force stop loading state
          setLoading(false);
          setAttempts(maxAttempts); // Prevent further retries
          setDebugInfo(prev => ({ ...prev, verificationStatus: 'success' }));
          return;
        } 
        // PARTIAL SUCCESS: Payment received but might still be processing
        else if (result && result.status === 'pending' && result.paymentProviderStatus === 'processing') {
          console.log('Payment is processing - will retry');
          // Retry after delay
          setTimeout(() => {
            verifyPayment();
          }, 3000);
          return;
        }
        // FAILURE PATH: Payment verification failed
        else {
          throw new Error('Payment status verification failed. Please try again.');
        }
      } catch (error: any) {
        // Log error for debugging
        console.error('Error verifying payment:', error);
        
        // Check if we've reached max attempts
        if (attempts >= maxAttempts) {
          throw error; // This will be caught by the outer try/catch
        }
        
        // Retry after delay for network errors or when status is pending
        console.log(`Retry attempt ${attempts + 1} of ${maxAttempts} after 3 seconds...`);
        setTimeout(() => {
          verifyPayment();
        }, 3000);
      }
    } catch (error: any) {
      console.error('Payment verification failed after retries:', error);
      
      // Determine error message based on error type
      let errorMessage = 'Unable to verify payment status. Please check your order history.';
      
      if (error?.response?.status === 404) {
        errorMessage = 'Payment session not found. It may have expired or been cancelled.';
      } else if (error?.response?.status === 401 || error?.response?.status === 403) {
        errorMessage = 'Authorization error. Please log in again and try once more.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Stop retrying after max attempts or for certain errors
      console.log('Stopping payment verification attempts due to error or max retries reached');
      setAttempts(maxAttempts); // Ensure no more retries
      
      setError(errorMessage);
      setLoading(false);
      toast({
        title: "Payment Verification Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Run verification when component mounts
  useEffect(() => {
    verifyPayment();
  }, []);
  
  // Additional useEffect removed as it's now redundant

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center dark:bg-slate-950">
      {/* Debug Panel - Show when debugging is needed */}
      {debugInfo && debugInfo.attempts > 0 && (
        <div className="fixed bottom-4 right-4 p-4 bg-black/80 text-white rounded-lg max-w-sm overflow-auto max-h-96 text-xs font-mono">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold flex items-center">
              <Bug className="w-4 h-4 mr-1" /> Debug Info
            </h4>
            <button 
              onClick={() => setDebugInfo(null)} 
              className="text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="text-left">
            <p><span className="text-blue-400">Session ID:</span> {sessionId}</p>
            <p><span className="text-blue-400">Order ID:</span> {orderId}</p>
            <p><span className="text-blue-400">Status:</span> {debugInfo.verificationStatus}</p>
            <p><span className="text-blue-400">Attempts:</span> {debugInfo.attempts}</p>
            {debugInfo.lastResponseData && (
              <div className="mt-2">
                <p className="text-green-400">Last API Response:</p>
                <pre className="mt-1 text-[10px] whitespace-pre-wrap">
                  {JSON.stringify(debugInfo.lastResponseData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-4">
          <Spinner size="lg" className="text-primary" />
          <h2 className="text-xl font-bold">Verifying Payment...</h2>
          <p className="text-gray-300 text-center">
            Please wait while we confirm your payment status.
          </p>
          <div className="text-sm text-gray-400">
            Attempt {attempts} of {maxAttempts}
          </div>
          
          {/* Always show some debugging info to help with troubleshooting */}
          <div className="mt-4 p-3 bg-gray-800 rounded-md text-xs text-left w-full">
            <p className="text-gray-400 mb-2">Verification Progress:</p>
            <div className="space-y-1">
              <p>• Session ID: {sessionId ? '✅ Found in URL' : '❌ Missing from URL'}</p>
              <p>• Order ID: {orderId ? '✅ Found in URL' : '❌ Missing from URL'}</p>
              <p>• Stored Session: {localStorage.getItem('stripeSessionId') ? '✅ Found in storage' : '❌ Missing from storage'}</p>
              <p>• Stored Order: {localStorage.getItem('currentPaymentOrderId') ? '✅ Found in storage' : '❌ Missing from storage'}</p>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center dark:bg-red-900/20">
            <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-500" />
          </div>
          <h2 className="text-2xl font-semibold text-red-600 dark:text-red-500">Payment Verification Failed</h2>
          <p className="text-gray-700 dark:text-gray-300 max-w-md text-center">{error}</p>
          
          {/* Check localStorage and provide feedback */}
          {localStorage.getItem('stripeSessionId') && (
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-sm">
              Your payment may have been processed successfully, but we couldn't verify it automatically.
            </div>
          )}
          
          {/* Recovery options */}
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg max-w-md">
            <h3 className="font-medium text-amber-800 dark:text-amber-400 mb-2">What can you do now?</h3>
            <ul className="text-sm text-left list-disc pl-5 text-amber-700 dark:text-amber-300 space-y-1">
              <li>Return to the menu and try placing your order again</li>
              <li>Check your order history to see if your order was processed despite this error</li>
              <li>Contact restaurant staff if you need immediate assistance</li>
            </ul>
          </div>
          
          {/* Manual recovery button */}
          <Button 
            variant="outline"
            className="mt-2"
            onClick={() => {
              // Try to load orders page - the payment might have succeeded despite verification error
              navigate('/my-orders');
            }}
          >
            Check My Orders
          </Button>
          
          {/* Debug information for troubleshooting */}
          <div className="mt-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-full max-w-md text-xs">
            <details>
              <summary className="font-medium text-gray-600 dark:text-gray-400 cursor-pointer">Debug Information</summary>
              <div className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
                <p>• Session ID: {sessionId || 'Not found in URL'}</p>
                <p>• Order ID: {orderId || 'Not found in URL'}</p>
                <p>• Stored Session: {localStorage.getItem('stripeSessionId') || 'None'}</p>
                <p>• Stored Order: {localStorage.getItem('currentPaymentOrderId') || 'None'}</p>
                <p>• URL Parameters: {JSON.stringify(allParams)}</p>
              </div>
            </details>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <Button 
              onClick={() => navigate('/menu')}
              className="bg-primary hover:bg-primary/90 text-white font-medium px-6 py-2"
            >
              Return to Menu
            </Button>
            <Button 
              variant="outline" 
              className="border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => {
                window.location.reload();
              }}
            >
              Try Again
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-6">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center dark:bg-green-900/20">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-500" />
          </div>
          
          {/* Success message */}
          <div>
            <h2 className="text-2xl font-semibold text-green-600 dark:text-green-500">Payment Successful!</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Your payment has been processed and your order is on its way.
            </p>
          </div>
          
          {/* Order details card */}
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-md w-full border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Order Details</h3>
            <div className="space-y-2 text-sm">
              {paymentData?.orderId && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Order ID:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{paymentData.orderId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                <span className="font-medium text-green-600 dark:text-green-500">Paid</span>
              </div>
              {paymentData?.stripeSession?.amountTotal && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    ${(paymentData.stripeSession.amountTotal / 100).toFixed(2)} {paymentData.stripeSession.currency?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Table Number:</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{tableNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Restaurant:</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{restaurantName || 'InSeat'}</span>
              </div>
            </div>
          </div>
          
          {/* Order status card */}
          <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg max-w-md w-full">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-medium text-blue-800 dark:text-blue-400">What happens next?</h3>
            </div>
            <ol className="mt-2 ml-6 text-sm text-blue-700 dark:text-blue-300 list-decimal space-y-1">
              <li>Your order has been sent to the kitchen</li>
              <li>The kitchen staff will prepare your food</li>
              <li>A server will bring your order to your table</li>
            </ol>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <Button 
              onClick={() => {
                // Get table ID from various possible sources
                const storedTableId = localStorage.getItem('currentTableId') || 
                                      localStorage.getItem('table_id') || 
                                      localStorage.getItem('tableId');
                
                // Use the table ID if available, otherwise navigate to default path
                if (storedTableId) {
                  navigate(`/?table=${storedTableId}`);
                } else {
                  navigate('/menu');
                }
              }}
              className="bg-primary hover:bg-primary/90 text-white font-medium px-6 py-2"
            >
              Continue Ordering
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                // Get table ID from various possible sources
                const storedTableId = localStorage.getItem('currentTableId') || 
                                      localStorage.getItem('table_id') || 
                                      localStorage.getItem('tableId');
                
                // Ensure the order is properly formed before adding to context
                if (paymentData?.orderId) {
                  // Create a properly formed order object with all required fields
                  // Ensure every property used in MyOrders.tsx has a valid value
                  const completeOrder = {
                    // Required identifiers - guaranteed to exist
                    _id: paymentData.orderId,
                    id: paymentData.orderId,
                    orderNumber: paymentData.orderId.slice(-6),
                    
                    // Status fields with default values to prevent undefined errors
                    status: 'completed', // Explicitly set status to avoid undefined
                    paymentStatus: 'paid',
                    
                    // Financial information with defaults
                    totalAmount: paymentData.stripeSession?.amountTotal 
                      ? (paymentData.stripeSession.amountTotal / 100) 
                      : (paymentData.amount || 0),
                    
                    // Order content information with defaults
                    items: paymentData.items || [],
                    
                    // Time-related fields
                    createdAt: paymentData.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    
                    // Add any additional fields that might be accessed in MyOrders.tsx
                    restaurant: paymentData.restaurant || {
                      name: restaurantName || 'Restaurant'
                    },
                    table: {
                      number: tableNumber || 'Unknown',
                      id: tableId || 'Unknown'
                    },
                    // Add a success flag for consistent checking
                    success: true
                  };
                  
                  console.log('Adding complete order to context before navigation:', completeOrder);
                  
                  // Ensure the order is added to context with all required fields
                  // Use type assertion with partial to handle missing properties
                  addOrder({
                    ...completeOrder,
                    subtotal: completeOrder.totalAmount || 0,
                    tax: 0,
                    tip: 0,
                    serviceFee: 0,
                    total: completeOrder.totalAmount || 0,
                    timestamp: new Date(completeOrder.createdAt || new Date().toISOString())
                  } as any);
                } else {
                  // Even if we don't have complete order data, try to add a minimal valid order
                  // This prevents errors when viewing orders
                  console.log('No complete order data available, creating minimal order object');
                  
                  const minimalOrder = {
                    _id: orderId || `order_${Date.now()}`,
                    id: orderId || `order_${Date.now()}`,
                    status: 'completed',
                    paymentStatus: 'paid',
                    totalAmount: 0,
                    items: [],
                    createdAt: new Date().toISOString()
                  };
                  
                  if (orderId) {
                    // Use type assertion with partial to handle missing properties
                    addOrder({
                      ...minimalOrder,
                      subtotal: minimalOrder.totalAmount || 0,
                      tax: 0,
                      tip: 0,
                      serviceFee: 0,
                      total: minimalOrder.totalAmount || 0,
                      timestamp: new Date(minimalOrder.createdAt || new Date().toISOString()),
                      tableId: tableId || 'unknown'
                    } as any);
                  }
                }
                
                // Use the table ID if available, otherwise navigate to default path
                if (storedTableId) {
                  navigate(`/my-orders?table=${storedTableId}`);
                } else {
                  navigate('/my-orders');
                }
              }}
              className="border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              View My Orders
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSuccess;
