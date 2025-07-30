import apiClient from './apiClient';

// Cash payment request interface
export interface CashPaymentRequest {
  tableId: string;
  totalAmount: number;
  orderIds?: string[];
  additionalInfo?: string;
  userId?: string;
  deviceId?: string;
  isGuest?: boolean;
}

// Cash payment response interface
interface CashPaymentResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: {
    message: string;
  };
}

/**
 * Create a cash payment request
 */
export const createCashPaymentRequest = async (
  request: CashPaymentRequest
): Promise<CashPaymentResponse> => {
  try {
    console.log('Creating cash payment request:', request);
    
    const response = await apiClient.post('/api/cash-payments', request);
    
    console.log('Cash payment request response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating cash payment request:', error);
    throw error;
  }
};

/**
 * Get all cash payment requests by table ID
 */
export const getCashPaymentRequestsByTable = async (
  tableId: string,
  userId?: string,
  deviceId?: string
): Promise<CashPaymentResponse> => {
  try {
    console.log('Getting cash payment requests for table:', tableId);
    
    // Build query parameters - need either userId or deviceId for security
    const queryParams = new URLSearchParams();
    
    if (userId) {
      queryParams.append('userId', userId);
    } else if (deviceId) {
      queryParams.append('deviceId', deviceId);
    } else {
      // Generate a device ID if none provided (for guest users)
      const generatedDeviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      queryParams.append('deviceId', generatedDeviceId);
      console.log('Generated device ID for guest user:', generatedDeviceId);
    }
    
    const response = await apiClient.get(`/api/cash-payments/table/${tableId}?${queryParams.toString()}`);
    
    console.log('Cash payment requests found:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting cash payment requests:', error);
    throw error;
  }
};

/**
 * Cancel a cash payment request
 */
export const cancelCashPaymentRequest = async (
  requestId: string
): Promise<CashPaymentResponse> => {
  try {
    console.log('Cancelling cash payment request:', requestId);
    
    const response = await apiClient.patch(`/api/cash-payments/${requestId}/cancel`);
    
    console.log('Cash payment request cancelled:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error cancelling cash payment request:', error);
    throw error;
  }
};