import apiClient from './apiClient';

export enum WaiterCallReason {
  NEED_ASSISTANCE = 'NEED_ASSISTANCE',
  NEED_REFILL = 'NEED_REFILL',
  NEED_UTENSILS = 'NEED_UTENSILS',
  OTHER = 'OTHER'
}

export enum WaiterCallStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED'
}

export interface WaiterCall {
  _id: string;
  tableId: string;
  tableNumber: string;
  restaurantId: string;
  venueId: string;
  reason: WaiterCallReason;
  additionalInfo?: string;
  status: WaiterCallStatus;
  userId?: string;
  deviceId?: string;
  isGuest?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  duration?: number; // Virtual field - seconds since created
}

export interface CreateWaiterCallRequest {
  tableId: string;
  reason: WaiterCallReason;
  additionalInfo?: string;
  userId?: string;
  deviceId?: string;
  isGuest?: boolean;
}

export interface WaiterCallResponse {
  success: boolean;
  message: string;
  data: WaiterCall;
}

export interface WaiterCallsListResponse {
  success: boolean;
  data: WaiterCall[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const waiterCallService = {
  // Create a new waiter call
  async createWaiterCall(request: CreateWaiterCallRequest): Promise<WaiterCallResponse> {
    try {
      const response = await apiClient.post('/api/waiter-calls', request);
      return response.data;
    } catch (error: any) {
      console.error('Error creating waiter call:', error);
      throw new Error(error.response?.data?.message || 'Failed to create waiter call');
    }
  },

  // Get waiter calls for a restaurant
  async getWaiterCalls(
    restaurantId: string,
    options: {
      status?: WaiterCallStatus;
      venueId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<WaiterCallsListResponse> {
    try {
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.venueId) params.append('venueId', options.venueId);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());

      const response = await apiClient.get(
        `/api/waiter-calls/restaurant/${restaurantId}?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching waiter calls:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch waiter calls');
    }
  },

  // Get active calls count for a restaurant
  async getActiveCallsCount(restaurantId: string, venueId?: string): Promise<{ activeCallsCount: number }> {
    try {
      const params = venueId ? `?venueId=${venueId}` : '';
      const response = await apiClient.get(
        `/api/waiter-calls/restaurant/${restaurantId}/active-count${params}`
      );
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching active calls count:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch active calls count');
    }
  },

  // Get waiter call by ID
  async getWaiterCallById(callId: string): Promise<WaiterCallResponse> {
    try {
      const response = await apiClient.get(`/api/waiter-calls/${callId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching waiter call:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch waiter call');
    }
  },

  // Resolve a waiter call
  async resolveWaiterCall(callId: string, resolvedBy: string): Promise<WaiterCallResponse> {
    try {
      const response = await apiClient.patch(`/api/waiter-calls/${callId}/resolve`, {
        resolvedBy
      });
      return response.data;
    } catch (error: any) {
      console.error('Error resolving waiter call:', error);
      throw new Error(error.response?.data?.message || 'Failed to resolve waiter call');
    }
  },

  // Cancel a waiter call
  async cancelWaiterCall(callId: string): Promise<WaiterCallResponse> {
    try {
      const response = await apiClient.patch(`/api/waiter-calls/${callId}/cancel`);
      return response.data;
    } catch (error: any) {
      console.error('Error cancelling waiter call:', error);
      throw new Error(error.response?.data?.message || 'Failed to cancel waiter call');
    }
  },

  // Get waiter calls by table ID
  async getWaiterCallsByTable(tableId: string): Promise<WaiterCall[]> {
    try {
      const response = await apiClient.get(`/api/waiter-calls/table/${tableId}`);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('Error fetching waiter calls by table:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch waiter calls');
    }
  }
};

export default waiterCallService;