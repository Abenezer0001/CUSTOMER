import { CartItem } from '@/types';
import apiClient from './apiClient';
import { API_BASE_URL } from '@/constants';

// Stripe response type
interface StripeSessionResponse {
  success: boolean;
  url: string;
  sessionId: string;
  error?: {
    message: string;
  };
}

// Payment status response
interface PaymentStatusResponse {
  success: boolean;
  status: 'paid' | 'pending' | 'failed';
  paymentProviderStatus?: string; // Status from payment provider (e.g., Stripe)
  orderId?: string;
  paymentId?: string;
  sessionId?: string;
  amount?: number;
  currency?: string;
  error?: {
    message: string;
  };
}

/**
 * Create a Stripe checkout session for the given order
 */
export const createStripeCheckoutSession = async (
  cartItems: CartItem[],
  tableId: string,
  restaurantId: string,
  orderId?: string
): Promise<StripeSessionResponse> => {
  try {
    console.log('createStripeCheckoutSession called for tableId:', tableId, 'restaurantId:', restaurantId, 'orderId:', orderId);
    console.log('Processing cart items for Stripe:', cartItems.length, 'items');
    
    // Validate inputs
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error('Cart items are required and cannot be empty');
    }
    
    if (!tableId) {
      throw new Error('Table ID is required');
    }
    
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }
    
    // Format cart items for the Stripe session
    const lineItems = cartItems.map((item, index) => {
      console.log(`Processing item ${index + 1}:`, { name: item.name, price: item.price, quantity: item.quantity, modifiers: item.modifiers?.length || 0 });
      
      // Validate and sanitize item data
      if (!item.name || typeof item.price !== 'number' || typeof item.quantity !== 'number') {
        console.error('Invalid item data:', item);
        throw new Error(`Invalid item data for item: ${item.name || 'Unknown'}`);
      }
      
      // Sanitize numeric values to prevent NaN or Infinity
      const sanitizedPrice = Number.isFinite(item.price) ? item.price : 0;
      const sanitizedQuantity = Number.isFinite(item.quantity) && item.quantity > 0 ? Math.floor(item.quantity) : 1;
      
      if (sanitizedPrice < 0 || sanitizedQuantity <= 0) {
        throw new Error(`Invalid price ($${sanitizedPrice}) or quantity (${sanitizedQuantity}) for item: ${item.name}`);
      }
      
      // Use sanitized values for calculations
      const itemPrice = sanitizedPrice;
      const itemQuantity = sanitizedQuantity;
      
      // Calculate the total price including modifiers
      let modifierPrice = 0;
      if (item.modifiers && Array.isArray(item.modifiers)) {
        modifierPrice = item.modifiers.reduce((sum, mod) => {
          const price = typeof mod.price === 'number' ? mod.price : 0;
          if (price < 0) {
            console.warn(`Negative modifier price detected for ${mod.name}: ${price}`);
            return sum; // Skip negative modifiers
          }
          return sum + price;
        }, 0);
      }
      
      // Apply proper precision handling to avoid floating point errors
      const baseItemPrice = Number((itemPrice + modifierPrice).toFixed(2));
      const totalItemPrice = Math.round(baseItemPrice * 100); // Convert to cents for Stripe
      
      console.log(`Item calculation: base=${item.price}, modifiers=${modifierPrice}, total=${baseItemPrice}, cents=${totalItemPrice}`);
      
      // Enhanced validation with detailed logging
      const isValidInteger = Number.isInteger(totalItemPrice);
      const isPositive = totalItemPrice > 0;
      const isNotNaN = !isNaN(totalItemPrice);
      const isFinite = Number.isFinite(totalItemPrice);
      const isReasonableAmount = totalItemPrice <= 1000000; // Max $10,000 per item
      
      console.log('Price validation details:', {
        item: item.name,
        originalPrice: item.price,
        sanitizedPrice: itemPrice,
        modifierPrice,
        baseItemPrice,
        totalItemPrice,
        isValidInteger,
        isPositive,
        isNotNaN,
        isFinite,
        isReasonableAmount
      });
      
      // Validate final price - ensure it's a positive integer
      if (!isValidInteger || !isPositive || !isNotNaN || !isFinite || !isReasonableAmount) {
        console.error('Invalid totalItemPrice:', { 
          baseItemPrice, 
          totalItemPrice, 
          item: { name: item.name, price: item.price, modifiers: item.modifiers?.length || 0 },
          validation: {
            isValidInteger,
            isPositive,
            isNotNaN,
            isFinite,
            isReasonableAmount
          }
        });
        throw new Error(`Invalid calculated price for item: ${item.name}. Price: $${item.price}, Modifiers: $${modifierPrice}, Total: $${baseItemPrice.toFixed(2)} (${totalItemPrice} cents)`);
      }
      
      // Format description including modifiers
      let description = item.name;
      if (item.modifiers && item.modifiers.length > 0) {
        const modifierNames = item.modifiers.map(mod => mod.name).join(', ');
        description += ` with ${modifierNames}`;
      }
      if (item.specialInstructions) {
        description += `. Note: ${item.specialInstructions}`;
      }
      
      const lineItem = {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: description,
            images: item.image ? [item.image] : undefined
          },
          unit_amount: totalItemPrice // Amount in cents
        },
        quantity: itemQuantity
      };
      
      console.log(`Created line item for ${item.name}:`, { unit_amount: totalItemPrice, quantity: item.quantity });
      return lineItem;
    });

    console.log('Total line items created:', lineItems.length);
    
    // Validate that we have line items
    if (lineItems.length === 0) {
      throw new Error('No valid line items could be created from cart items');
    }
    
    // Calculate and validate total amount
    const calculatedTotalCents = lineItems.reduce((sum, item) => sum + (item.price_data.unit_amount * item.quantity), 0);
    const calculatedTotalDollars = calculatedTotalCents / 100;
    
    console.log('Payment Service Validation:', {
      calculatedTotalCents,
      calculatedTotalDollars,
      lineItemsCount: lineItems.length,
      cartItemsCount: cartItems.length
    });
    
    // Validate reasonable amount (not zero or negative)
    if (calculatedTotalCents <= 0) {
      throw new Error(`Invalid payment amount: $${calculatedTotalDollars.toFixed(2)}. Please check your order items.`);
    }
    
    // Validate not unreasonably high (over $1000)
    if (calculatedTotalCents > 100000) {
      throw new Error(`Payment amount seems too high: $${calculatedTotalDollars.toFixed(2)}. Please verify your order.`);
    }
    
    // Request body for the API
    // Make sure tableId and restaurantId are strings for Stripe metadata
    const tableIdStr = typeof tableId === 'object' ? 
      (tableId && 'id' in tableId ? String((tableId as any).id) : 
       tableId && '_id' in tableId ? String((tableId as any)._id) : 
       String(tableId)) : 
      String(tableId || '');
      
    const restaurantIdStr = typeof restaurantId === 'object' ? 
      (restaurantId && 'id' in restaurantId ? String((restaurantId as any).id) : 
       restaurantId && '_id' in restaurantId ? String((restaurantId as any)._id) : 
       String(restaurantId)) : 
      String(restaurantId || '');
    
    console.log('Processing IDs for Stripe:', { 
      tableId: { original: tableId, processed: tableIdStr }, 
      restaurantId: { original: restaurantId, processed: restaurantIdStr },
      orderId: orderId || 'Not provided'
    });
    
    // Validate processed IDs
    if (!tableIdStr || tableIdStr === 'undefined' || tableIdStr === 'null') {
      throw new Error('Invalid table ID provided');
    }
    
    if (!restaurantIdStr || restaurantIdStr === 'undefined' || restaurantIdStr === 'null') {
      throw new Error('Invalid restaurant ID provided');
    }
    
    const requestBody = {
      tableId: tableIdStr,
      restaurantId: restaurantIdStr,
      lineItems,
      metadata: {
        tableId: tableIdStr,
        restaurantId: restaurantIdStr,
        ...(orderId && { orderId: String(orderId) })
      }
    };

    // Add success and cancel URLs
    const successUrl = `${window.location.origin}/payment/success`;
    const cancelUrl = `${window.location.origin}/payment/cancel`;
    
    // Call API to create Stripe session using apiClient
    console.log('Making API request to create checkout session with body:', {
      ...requestBody,
      lineItems: lineItems.map(item => ({
        ...item,
        price_data: {
          ...item.price_data,
          unit_amount: item.price_data.unit_amount
        }
      }))
    });
    
    // Use apiClient which handles auth headers automatically
    const response = await apiClient.post('/api/payments/create-checkout-session', {
      ...requestBody,
      successUrl,
      cancelUrl
    });
    
    console.log('Payment API response:', { status: response.status, data: response.data });

    if (!response.data) {
      throw new Error('No response data received from payment service');
    }

    if (!response.data.success) {
      const errorMessage = response.data.error?.message || 'Failed to create payment session';
      console.error('Payment session creation failed:', response.data);
      throw new Error(errorMessage);
    }
    
    // Validate response data
    if (!response.data.url || !response.data.sessionId) {
      console.error('Invalid response data from payment service:', response.data);
      throw new Error('Invalid response from payment service - missing URL or session ID');
    }
    
    // Store the Stripe session ID in localStorage for later reference
    console.log('Storing Stripe session ID in localStorage:', response.data.sessionId);
    localStorage.setItem('stripeSessionId', response.data.sessionId);
    
    // Also store order ID if provided for tracking
    if (orderId) {
      localStorage.setItem('pending_order_id', orderId);
    }

    return response.data;
  } catch (error) {
    console.error('Error creating payment session:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('Invalid calculated price')) {
        throw new Error('One or more items in your cart have invalid pricing. Please refresh and try again.');
      } else if (error.message.includes('Invalid table ID') || error.message.includes('Invalid restaurant ID')) {
        throw new Error('Session information is invalid. Please scan the table QR code again.');
      } else if (error.message.includes('Cart items are required')) {
        throw new Error('Your cart is empty. Please add items before checking out.');
      } else {
        throw error;
      }
    } else {
      throw new Error('An unexpected error occurred while setting up payment. Please try again.');
    }
  }
}

/**
 * Check the status of a Stripe payment session
 */
export const checkPaymentStatus = async (
  sessionId: string
): Promise<PaymentStatusResponse> => {
  try {
    console.log(`Checking payment status for session ${sessionId}`);
    
    // Debug the API base URL and request path
    console.log('API Base URL:', API_BASE_URL);
    
    // Validate the session ID
    if (!sessionId) {
      console.error('Missing session ID');
      throw new Error('Missing session ID');
    }
    
    // Log the session ID we're working with
    console.log('Checking payment status with session ID:', sessionId);
    
    // In case we're receiving a non-Stripe format, try to extract the proper format
    // Stripe session IDs typically start with cs_test_ or cs_live_
    let normalizedSessionId = sessionId;
    
    // If the session doesn't look like a Stripe session ID, it might be from our local system
    // This handles the case where we're getting timestamps or internal IDs
    if (!sessionId.startsWith('cs_test_') && !sessionId.startsWith('cs_live_')) {
      console.warn('Session ID does not appear to be a standard Stripe format:', sessionId);
      
      // Check if we have the correct session ID in localStorage
      const storedSessionId = localStorage.getItem('stripeSessionId');
      if (storedSessionId && (storedSessionId.startsWith('cs_test_') || storedSessionId.startsWith('cs_live_'))) {
        console.log('Using stored Stripe session ID instead:', storedSessionId);
        normalizedSessionId = storedSessionId;
      } else {
        console.warn('No valid Stripe session ID found in storage, proceeding with original ID');
      }
    }

    // Make sure we're using the correct endpoint - try multiple approaches to cover all bases
    // Create all possible endpoint variations to ensure we hit the right one
    const endpointPaths = [
      `/api/payments/sessions/${normalizedSessionId}`,      // Full path with /api prefix
      `/payments/sessions/${normalizedSessionId}`,         // Without /api prefix (apiClient might add it)
      `/api/payments/check-session/${normalizedSessionId}`, // Legacy endpoint with /api prefix
      `/payments/check-session/${normalizedSessionId}`     // Legacy endpoint without /api prefix
    ];
    
    // Use apiClient which handles auth headers automatically
    try {
      console.log(`Attempting to check payment status with primary endpoint: /api/payments/sessions/${normalizedSessionId}`);
      const response = await apiClient.get(`/api/payments/sessions/${normalizedSessionId}`);
      
      // Log the response for debugging
      console.log('Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      return response.data;
    } catch (primaryError: any) {
      console.log('Primary endpoint failed, trying fallback endpoints');
      
      // Try fallback endpoints
      let response = null;
      let lastError = primaryError;
      let errors: Record<string, any> = {
        primary: {
          message: primaryError.message,
          status: primaryError.response?.status,
          statusText: primaryError.response?.statusText,
          data: primaryError.response?.data
        }
      };
      
      // If the error is a 404 with a message about the session not found on Stripe,
      // this is a clear indication that the session ID is invalid
      if (primaryError.response?.status === 404 && 
          primaryError.response?.data?.error?.message?.includes('not found on payment provider')) {
        throw new Error('Payment session expired or invalid. Please try creating a new order.');
      }
      
      // Try alternative endpoints
      for (const path of endpointPaths.slice(1)) { // Skip the first endpoint which we already tried
        try {
          console.log(`Attempting to check payment status with fallback endpoint: ${path}`);
          response = await apiClient.get(path);
          
          // Log the response for debugging
          console.log(`Response from ${path}:`, {
            status: response.status,
            statusText: response.statusText,
            data: response.data
          });
          
          if (response.status === 200) {
            console.log(`Success with endpoint: ${path}`);
            break;
          }
        } catch (err: any) {
          // Extract and log detailed error information
          const errorDetails = {
            message: err.message,
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data
          };
          
          console.log(`Failed with endpoint: ${path}`, errorDetails);
          errors[path] = errorDetails;
          lastError = err;
        }
      }
      
      // If we've tried all endpoints and none worked, provide a detailed error
      if (!response) {
        console.error('All payment status endpoints failed:', errors);
        
        // Create a more user-friendly error message
        const statusCode = lastError.response?.status;
        if (statusCode === 404) {
          throw new Error('Payment session not found. It may have expired or been cancelled.');
        } else if (statusCode === 401 || statusCode === 403) {
          throw new Error('Authorization error. Please log in again and try once more.');
        } else {
          throw new Error(`Payment verification failed: ${lastError.message || 'Unknown error'}`);
        }
      }
    
      if (!response || !response.data) {
        throw new Error('No response data received from payment status check');
      }

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to check payment status');
      }

      return response.data;
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    throw error;
  }
}

/**
 * Update order with payment information
 */
export const updateOrderPayment = async (
  orderId: string,
  paymentStatus: string,
  paymentId: string
): Promise<any> => {
  try {
    console.log(`Updating order payment for ${orderId} to ${paymentStatus}`);

    // Use apiClient which handles auth headers automatically
    const response = await apiClient.put(`/api/orders/${orderId}/payment`, { orderId, paymentStatus, paymentId });

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update order payment');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error updating order payment:', error);
    throw error;
  }
}
