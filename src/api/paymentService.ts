import { API_BASE_URL } from '@/config/constants';
import { CartItem } from '@/types';
import apiClient from './apiClient';

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
  orderId?: string;
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
    console.log(`Making API request to ${API_BASE_URL}/api/payments/create-checkout-session`);
    const response = await apiClient.post('/api/payments/create-checkout-session', {
      ...requestBody,
      successUrl,
      cancelUrl
    });
    
    console.log('Payment API response status:', response.status);

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create payment session');
    }

    return response.data;
  } catch (error) {
    console.error('Error creating payment session:', error);
    throw error;
  }
};

/**
 * Check the status of a Stripe payment session
 */
export const checkPaymentStatus = async (
  sessionId: string
): Promise<PaymentStatusResponse> => {
  try {
    console.log(`Checking payment status for session ${sessionId} (relying on HttpOnly cookies)`);

    const response = await apiClient.get(`/api/payments/check-session/${sessionId}`);

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to check payment status');
    }

    return response.data;
  } catch (error) {
    console.error('Error checking payment status:', error);
    throw error;
  }
};

/**
 * Update order with payment information
 */
export const updateOrderPayment = async (
  orderId: string,
  paymentStatus: string,
  paymentId: string
): Promise<any> => {
  try {
    console.log(`Updating order payment for ${orderId} to ${paymentStatus} (relying on HttpOnly cookies)`);

    const response = await apiClient.put(`/api/orders/${orderId}/payment`, { orderId, paymentStatus, paymentId });

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update order payment');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error updating order payment:', error);
    throw error;
  }
};