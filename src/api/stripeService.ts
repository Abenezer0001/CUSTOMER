import apiClient from './apiClient';
import { Order, PaymentStatus } from '@/types';

/**
 * Helper function to get table ID from localStorage
 * Checks multiple sources to ensure we get a valid table ID
 */
const getTableIdFromLocalStorage = (): string => {
  try {
    // First check tableInfo which contains the full table data
    const tableInfo = localStorage.getItem('tableInfo');
    if (tableInfo) {
      const parsedTableInfo = JSON.parse(tableInfo);
      if (parsedTableInfo?.id) {
        console.log('Found table ID in tableInfo:', parsedTableInfo.id);
        return parsedTableInfo.id;
      }
    }
    
    // If not found, check currentTableId which is a direct reference
    const currentTableId = localStorage.getItem('currentTableId');
    if (currentTableId) {
      console.log('Found table ID in currentTableId:', currentTableId);
      return currentTableId;
    }
    
    // Finally, check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get('table');
    if (tableParam) {
      console.log('Found table ID in URL parameters:', tableParam);
      // Store it for future use
      localStorage.setItem('currentTableId', tableParam);
      return tableParam;
    }
  } catch (error) {
    console.error('Error getting table ID from localStorage:', error);
  }
  
  console.warn('No table ID found in any storage location');
  return '';
};

/**
 * Initiates a Stripe checkout session for an order
 * 
 * @param orderId - The ID of the order to pay for
 * @param order - The order data
 * @returns Promise resolving to the checkout URL
 * @throws Error if API request fails
 */
export const createStripeCheckout = async (
  orderId: string | undefined, 
  order: Order
): Promise<string> => {
  // Validate orderId before proceeding
  if (!orderId) {
    console.error('OrderId is undefined in createStripeCheckout');
    orderId = order.id || order._id; // Try to use order's ID if available
    
    if (!orderId) {
      throw new Error('Order ID is required for checkout');
    }
    console.log('Using order ID from order object:', orderId);
  }
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
            description: 'Sales tax', // Adding required description
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
            description: 'Gratuity', // Adding required description
          },
          unit_amount: Math.round(order.tip * 100), // Convert to cents
        },
        quantity: 1,
      });
    }

    // Get table ID from order or localStorage
    let tableId = order.tableId || getTableIdFromLocalStorage() || '';
    
    // Ensure tableId is a string, not an object
    if (typeof tableId === 'object') {
      console.warn('Table ID is an object, converting to string:', tableId);
      // If it has an id property, use that
      if (tableId && 'id' in tableId) {
        tableId = (tableId as any).id?.toString() || '';
      } 
      // If it has a _id property (MongoDB style), use that
      else if (tableId && '_id' in tableId) {
        tableId = (tableId as any)._id?.toString() || '';
      }
      // Otherwise, try to use the number property if available
      else if (tableId && 'number' in tableId) {
        tableId = (tableId as any).number?.toString() || '';
      }
      // Last resort, just stringify it
      else {
        try {
          const stringified = JSON.stringify(tableId);
          tableId = stringified !== '{}' ? stringified : '';
        } catch (e) {
          console.error('Failed to stringify tableId object:', e);
          tableId = '';
        }
      }
      console.log('Converted table ID to string:', tableId);
    }
    
    // If we found a table ID, ensure it's stored in localStorage for consistency
    if (tableId) {
      localStorage.setItem('currentTableId', tableId);
      console.log('Stored table ID in localStorage for payment flow:', tableId);
    }
    
    // Prepare metadata for the session
    const metadata = {
      orderId,
      orderNumber: order.orderNumber || orderId.slice(-6),
      tableId,
    };
    
    // Generate a session ID for tracking
    const sessionId = `session_${Date.now()}`;

    // Use explicit path to payments endpoint
    const apiUrl = '/api/payments/create-checkout-session'; // Ensure we're using the correct path
    console.log('Making Stripe checkout request to:', apiUrl);
    const response = await apiClient.post(apiUrl, {
      lineItems,
      orderId,
      metadata,
      // Set success and cancel URLs with table info if available
      successUrl: `${window.location.origin}/payment/success?orderId=${orderId}&sessionId=${sessionId}&table=${metadata.tableId}`,
      cancelUrl: `${window.location.origin}/payment/cancel?orderId=${orderId}&table=${metadata.tableId}`,
      // Include user ID if authenticated
      userId: localStorage.getItem('userId') || undefined,
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
    // Using explicit API path to payment sessions endpoint
    const apiUrl = `/api/payments/sessions/${sessionId}`;
    console.log('Checking payment session status at:', apiUrl);
    const response = await apiClient.get(apiUrl);
    
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
  orderId: string | undefined,
  paymentStatus: PaymentStatus
) => {
  try {
    // Ensure orderId is valid
    if (!orderId) {
      console.error('Invalid orderId provided to updateOrderPaymentStatus:', orderId);
      throw new Error('Invalid order ID provided');
    }

    // Use explicit API path for updating payment status
    const apiUrl = `/api/payments/orders/${orderId}/payment-status`;
    console.log('Updating payment status at:', apiUrl);
    
    // Update the order status
    const response = await apiClient.patch(apiUrl, {
      status: paymentStatus,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating payment status directly:', error);
    throw new Error(error instanceof Error ? error.message : 'Unknown error updating payment status');
  }
};
