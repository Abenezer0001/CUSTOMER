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
  restaurantId: string
): Promise<StripeSessionResponse> => {
  try {
    console.log('createStripeCheckoutSession called for tableId:', tableId, 'restaurantId:', restaurantId);
    console.log('Relying on HttpOnly cookies for authentication.');
    
    // Format cart items for the Stripe session
    const lineItems = cartItems.map(item => {
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
    
    console.log('Processing tableId for Stripe:', { original: tableId, processed: tableIdStr });
    console.log('Processing restaurantId for Stripe:', { original: restaurantId, processed: restaurantIdStr });
    
    const requestBody = {
      tableId: tableIdStr,
      restaurantId: restaurantIdStr,
      lineItems,
      metadata: {
        tableId: tableIdStr,
        restaurantId: restaurantIdStr
      }
    };

    // Add success and cancel URLs
    const successUrl = `${window.location.origin}/payment/success`;
    const cancelUrl = `${window.location.origin}/payment/cancel`;
    
    // Call API to create Stripe session using apiClient
    console.log(`Making API request to create checkout session`);
    // Use apiClient which handles auth headers automatically
    const response = await apiClient.post('/api/payments/create-checkout-session', {
      ...requestBody,
      successUrl,
      cancelUrl
    });
    
    console.log('Payment API response status:', response.status);

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create payment session');
    }
    
    // Store the Stripe session ID in localStorage for later reference
    // This is helpful if the redirect URL contains a different ID format
    if (response.data.sessionId) {
      console.log('Storing Stripe session ID in localStorage:', response.data.sessionId);
      localStorage.setItem('stripeSessionId', response.data.sessionId);
    }

    return response.data;
  } catch (error) {
    console.error('Error creating payment session:', error);
    throw error;
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
