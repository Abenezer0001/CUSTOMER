import apiClient from './apiClient';
import { Order, PaymentStatus } from '@/types';

/**
 * Initiates a Stripe checkout session for an order
 * 
 * @param orderId - The ID of the order to pay for
 * @param itemsData - Array of line items for Stripe (optional)
 * @returns Promise resolving to the checkout URL
 * @throws Error if API request fails
 */
export const createStripeCheckout = async (
  orderId: string, 
  order: Order
): Promise<string> => {
  try {
    // Prepare line items for Stripe from order data
    const lineItems = order.items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.specialInstructions || undefined,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add tax as a separate line item
    if (order.tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tax',
          },
          unit_amount: Math.round(order.tax * 100), // Convert to cents
        },
        quantity: 1,
      });
    }

    // Add tip as a separate line item if applicable
    if (order.tip && order.tip > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tip',
          },
          unit_amount: Math.round(order.tip * 100), // Convert to cents
        },
        quantity: 1,
      });
    }

    // Prepare metadata for the session
    const metadata = {
      orderId,
      orderNumber: order.orderNumber || orderId.slice(-6),
      tableId: order.tableId || '',
    };

    // Create checkout session
    const response = await apiClient.post('/api/payments/create-checkout-session', {
      lineItems,
      orderId,
      metadata,
      // Set success and cancel URLs
      successUrl: `${window.location.origin}/payment/success?orderId=${orderId}`,
      cancelUrl: `${window.location.origin}/payment/cancel?orderId=${orderId}`,
    });

    if (!response.data?.url) {
      throw new Error('No checkout URL received from payment service');
    }

    return response.data.url;
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create checkout session');
  }
};

/**
 * Checks the status of a Stripe payment session
 * 
 * @param sessionId - The Stripe session ID to check
 * @returns Promise resolving to the payment status
 * @throws Error if API request fails
 */
export const checkStripeSessionStatus = async (sessionId: string): Promise<{
  status: string;
  orderId?: string;
}> => {
  try {
    const response = await apiClient.get(`/api/payments/sessions/${sessionId}`);
    
    if (!response.data?.status) {
      throw new Error('Invalid response from payment status check');
    }
    
    return {
      status: response.data.status,
      orderId: response.data.orderId,
    };
  } catch (error) {
    console.error('Error checking Stripe session:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to check payment status');
  }
};

/**
 * Updates order payment status directly through order API
 * This is used as a fallback when Stripe integration is not available
 * 
 * @param orderId - ID of the order to update
 * @param paymentStatus - New payment status to set
 * @returns Promise resolving to the updated payment status data
 * @throws Error if API request fails
 */
export const updateOrderPaymentStatus = async (
  orderId: string,
  paymentStatus: PaymentStatus
) => {
  try {
    console.log(`Updating payment status for ${orderId} to ${paymentStatus}`);
    const response = await apiClient.put(`/api/orders/${orderId}/payment`, { paymentStatus });
    return response.data;
  } catch (error) {
    console.error('Error updating payment status directly:', error);
    throw new Error(error instanceof Error ? error.message : 'Unknown error updating payment status');
  }
};
