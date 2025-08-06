// Customer-facing Group Ordering Service for inseat-menu
import apiClient from '../api/apiClient';
import { API_BASE_URL } from '../config/constants';

export type PaymentStructure = 'pay_all' | 'equal_split' | 'pay_own' | 'custom_split';

// Customer Group Ordering interfaces
export interface GroupOrder {
  _id: string;
  sessionId: string;
  groupLeaderId: string;
  restaurantId: string;
  tableId: string;
  participants: Participant[];
  status: 'active' | 'locked' | 'placed' | 'completed' | 'cancelled';
  joinCode: string;
  expiresAt: Date;
  totalAmount: number;
  finalOrder: OrderItem[];
  spendingLimits?: {
    enabled: boolean;
    defaultLimit?: number;
    participantLimits: { [participantId: string]: number };
  };
  paymentStructure?: PaymentStructure;
  customSplits?: { [participantId: string]: number };
  deliveryInfo?: {
    address?: string;
    instructions?: string;
    scheduledFor?: Date;
    contactPhone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Participant {
  _id: string;
  userId?: string;
  userName: string;
  email: string;
  joinedAt: Date;
  items: OrderItem[];
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  isLeader?: boolean;
  spendingLimit?: number;
}

export interface OrderItem {
  itemId?: string; // Optional, backend will generate if not provided
  menuItemId: string;
  menuItemName?: string; // Optional for display
  name?: string; // Backend expects 'name' not 'menuItemName'
  quantity: number;
  price: number;
  customizations: string[];
  specialRequests?: string;
  addedBy?: string; // Optional, backend will use authenticated user
}

export interface JoinGroupRequest {
  joinCode: string;
  userName: string;
  email: string;
}

export interface CreateGroupRequest {
  restaurantId: string;
  tableId: string;
  expirationMinutes?: number;
  spendingLimits?: {
    enabled: boolean;
    defaultLimit?: number;
  };
}

export interface AddItemsRequest {
  items: OrderItem[];
}

export interface GroupOrderWebSocketEvents {
  participantJoined: (participant: Participant) => void;
  participantLeft: (participantId: string) => void;
  itemsAdded: (participantId: string, items: OrderItem[]) => void;
  itemsRemoved: (participantId: string, itemIds: string[]) => void;
  orderLocked: () => void;
  orderPlaced: (orderId: string) => void;
  orderCancelled: (reason: string) => void;
  paymentStatusChanged: (participantId: string, status: string) => void;
}

class GroupOrderingService {
  private baseUrl = '/api/group-orders';
  private wsConnection: WebSocket | null = null;
  private eventListeners: Partial<GroupOrderWebSocketEvents> = {};

  // Join an existing group order
  async joinGroupOrder(joinData: JoinGroupRequest): Promise<{
    groupOrder: GroupOrder;
    participantId: string;
    isNewGroup: boolean;
  }> {
    try {
      // Transform frontend joinCode to backend inviteCode
      const backendPayload = {
        inviteCode: joinData.joinCode,
        userName: joinData.userName,
        userEmail: joinData.email
      };
      
      const response = await apiClient.post(`${this.baseUrl}/join`, backendPayload);
      const responseData = response.data.data;
      
      // Transform the backend response to match frontend expectations
      const groupOrder: GroupOrder = {
        _id: responseData.groupOrder._id,
        sessionId: responseData.groupOrder.sessionId,
        groupLeaderId: responseData.groupOrder.createdBy || 'creator',
        restaurantId: responseData.groupOrder.restaurantId,
        tableId: responseData.groupOrder.tableId || '',
        participants: (responseData.groupOrder.participants || []).map(p => ({
          ...p,
          totalAmount: p.currentSpent || 0,
          items: p.items || [],
          paymentStatus: p.paymentStatus || 'pending',
          joinedAt: new Date(p.joinedAt || Date.now())
        })),
        status: responseData.groupOrder.status || 'active',
        joinCode: responseData.groupOrder.inviteCode, // Map inviteCode to joinCode
        expiresAt: new Date(responseData.groupOrder.expiresAt),
        totalAmount: responseData.groupOrder.totals?.total || 0,
        finalOrder: responseData.groupOrder.items || [],
        paymentStructure: responseData.groupOrder.paymentStructure || 'pay_own',
        deliveryInfo: responseData.groupOrder.deliveryInfo,
        spendingLimits: {
          enabled: responseData.groupOrder.spendingLimitRequired || false,
          defaultLimit: responseData.groupOrder.spendingLimits?.[0]?.amount,
          participantLimits: {}
        },
        createdAt: new Date(responseData.groupOrder.createdAt || Date.now()),
        updatedAt: new Date(responseData.groupOrder.updatedAt || Date.now())
      };
      
      return {
        groupOrder,
        participantId: responseData.participantId,
        isNewGroup: false
      };
    } catch (error: any) {
      // Check if the endpoint doesn't exist (404)
      if (error.response?.status === 404) {
        throw new Error('Group ordering feature is not yet available on this server. Please try again later.');
      }
      throw new Error(error.response?.data?.message || 'Failed to join group order');
    }
  }

  // Create a new group order (for group leaders)
  async createGroupOrder(groupData: CreateGroupRequest): Promise<{
    groupOrder: GroupOrder;
    participantId: string;
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/create`, groupData);
      const responseData = response.data.data;
      
      // Transform the backend response to match frontend expectations
      const groupOrder: GroupOrder = {
        _id: responseData.groupOrderId,
        sessionId: responseData.sessionId,
        groupLeaderId: responseData.groupLeaderId || 'creator',
        restaurantId: groupData.restaurantId,
        tableId: groupData.tableId,
        participants: [],
        status: 'active',
        joinCode: responseData.inviteCode, // Map inviteCode to joinCode
        expiresAt: new Date(responseData.expiresAt),
        totalAmount: 0,
        finalOrder: [],
        paymentStructure: responseData.paymentStructure || 'pay_own',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return {
        groupOrder,
        participantId: responseData.participantId || 'creator'
      };
    } catch (error: any) {
      // Check if the endpoint doesn't exist (404)
      if (error.response?.status === 404) {
        throw new Error('Group ordering feature is not yet available on this server. Please try again later.');
      }
      throw new Error(error.response?.data?.message || 'Failed to create group order');
    }
  }

  // Get group order details
  async getGroupOrder(groupOrderId: string): Promise<GroupOrder> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${groupOrderId}`);
      const responseData = response.data.data.groupOrder;
      
      // Transform the backend response to match frontend expectations
      const groupOrder: GroupOrder = {
        _id: responseData._id,
        sessionId: responseData.sessionId,
        groupLeaderId: responseData.createdBy || 'creator',
        restaurantId: responseData.restaurantId,
        tableId: responseData.tableId || '',
        participants: (responseData.participants || []).map(p => ({
          ...p,
          totalAmount: p.currentSpent || 0,
          items: p.items || [],
          paymentStatus: p.paymentStatus || 'pending',
          joinedAt: new Date(p.joinedAt || Date.now())
        })),
        status: responseData.status || 'active',
        joinCode: responseData.inviteCode, // Map inviteCode to joinCode
        expiresAt: new Date(responseData.expiresAt),
        totalAmount: responseData.totals?.total || 0,
        finalOrder: responseData.items || [],
        paymentStructure: responseData.paymentStructure || 'pay_own',
        deliveryInfo: responseData.deliveryInfo,
        spendingLimits: {
          enabled: responseData.spendingLimitRequired || false,
          defaultLimit: responseData.spendingLimits?.[0]?.amount,
          participantLimits: {}
        },
        createdAt: new Date(responseData.createdAt || Date.now()),
        updatedAt: new Date(responseData.updatedAt || Date.now())
      };
      
      return groupOrder;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch group order');
    }
  }

  // Add items to the group order
  async addItemsToGroup(groupOrderId: string, items: OrderItem[]): Promise<GroupOrder> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${groupOrderId}/add-items`, { items });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add items to group');
    }
  }

  // Remove items from group order
  async removeItemsFromGroup(groupOrderId: string, itemIds: string[]): Promise<GroupOrder> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${groupOrderId}/remove-items`, { itemIds });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to remove items from group');
    }
  }

  // Update participant information
  async updateParticipant(groupOrderId: string, participantData: {
    userName?: string;
    email?: string;
  }): Promise<GroupOrder> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${groupOrderId}/participant`, participantData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update participant');
    }
  }

  // Leave group order
  async leaveGroupOrder(groupOrderId: string, participantId?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${groupOrderId}/leave`, {
        participantId: participantId
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to leave group order');
    }
  }

  // Lock group order (leader only)
  async lockGroupOrder(groupOrderId: string): Promise<GroupOrder> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${groupOrderId}/lock`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to lock group order');
    }
  }

  // Place final group order (leader only)
  async placeFinalOrder(groupOrderId: string, paymentMethod?: string): Promise<{
    success: boolean;
    orderId: string;
    paymentRequired: boolean;
    paymentIntentId?: string;
  }> {
    try {
      // Get the group order to get sessionId
      const groupOrder = await this.getGroupOrder(groupOrderId);
      
      // Call the submit endpoint with sessionId
      const response = await apiClient.post(`${this.baseUrl}/${groupOrder.sessionId}/submit`, {
        finalDeliveryInfo: {
          address: groupOrder.deliveryInfo?.address || '',
          instructions: groupOrder.deliveryInfo?.instructions || '',
          scheduledFor: groupOrder.deliveryInfo?.scheduledFor,
          contactPhone: groupOrder.deliveryInfo?.contactPhone
        },
        paymentConfirmation: {
          allPaymentsProcessed: true,
          totalPaid: groupOrder.totalAmount,
          paymentIntentIds: []
        },
        orderNotes: 'Group order placed via INSEAT app'
      });
      
      // Transform the response to match expected format
      if (response.data.success) {
        return {
          success: true,
          orderId: response.data.data.groupOrderId,
          paymentRequired: false,
          paymentIntentId: undefined
        };
      }
      
      throw new Error(response.data.message || 'Failed to submit group order');
    } catch (error: any) {
      // Check if it's a 404 error (endpoint not found)
      if (error.response?.status === 404) {
        throw new Error('Group order submission feature is not yet available. Please try again later.');
      }
      throw new Error(error.response?.data?.message || error.message || 'Failed to place group order');
    }
  }

  // Cancel group order (leader only)
  async cancelGroupOrder(groupOrderId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${groupOrderId}/cancel`, { reason });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to cancel group order');
    }
  }

  // Get my group order history
  async getMyGroupOrders(page: number = 1, limit: number = 10): Promise<{
    groupOrders: GroupOrder[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/my-orders`, {
        params: { page, limit }
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch group order history');
    }
  }

  // Process individual payment for group order
  async processParticipantPayment(groupOrderId: string, paymentMethodId?: string): Promise<{
    success: boolean;
    paymentIntentId?: string;
    amount: number;
    message: string;
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${groupOrderId}/pay`, { paymentMethodId });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to process payment');
    }
  }

  // Get payment status for participant
  async getPaymentStatus(groupOrderId: string): Promise<{
    participantId: string;
    paymentStatus: 'pending' | 'paid' | 'failed';
    amount: number;
    paymentMethod?: string;
    paidAt?: Date;
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${groupOrderId}/payment-status`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch payment status');
    }
  }

  // Check if join code is valid
  async validateJoinCode(joinCode: string): Promise<{
    isValid: boolean;
    groupOrder?: {
      _id: string;
      restaurantName: string;
      tableNumber: string;
      participantCount: number;
      status: string;
      expiresAt: Date;
    };
    error?: string;
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/validate-join-code`, {
        params: { joinCode }
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to validate join code');
    }
  }

  // Get group order summary for display
  async getGroupOrderSummary(groupOrderId: string): Promise<{
    groupOrder: GroupOrder;
    orderSummary: {
      totalItems: number;
      totalAmount: number;
      participantCount: number;
      itemsByCategory: { [category: string]: OrderItem[] };
      paymentBreakdown: {
        participantId: string;
        participantName: string;
        amount: number;
        status: string;
      }[];
    };
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${groupOrderId}/summary`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch group order summary');
    }
  }

  // WebSocket Connection Management
  connectToGroupOrder(groupOrderId: string, events: Partial<GroupOrderWebSocketEvents>): void {
    this.eventListeners = events;
    
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/group-orders/${groupOrderId}/ws`;
    this.wsConnection = new WebSocket(wsUrl);

    this.wsConnection.onopen = () => {
      console.log('Connected to group order WebSocket');
    };

    this.wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.wsConnection.onclose = () => {
      console.log('Disconnected from group order WebSocket');
    };

    this.wsConnection.onerror = (error) => {
      console.error('Group order WebSocket error:', error);
    };
  }

  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'participant_joined':
        this.eventListeners.participantJoined?.(data.participant);
        break;
      case 'participant_left':
        this.eventListeners.participantLeft?.(data.participantId);
        break;
      case 'items_added':
        this.eventListeners.itemsAdded?.(data.participantId, data.items);
        break;
      case 'items_removed':
        this.eventListeners.itemsRemoved?.(data.participantId, data.itemIds);
        break;
      case 'order_locked':
        this.eventListeners.orderLocked?.();
        break;
      case 'order_placed':
        this.eventListeners.orderPlaced?.(data.orderId);
        break;
      case 'order_cancelled':
        this.eventListeners.orderCancelled?.(data.reason);
        break;
      case 'payment_status_changed':
        this.eventListeners.paymentStatusChanged?.(data.participantId, data.status);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  disconnectFromGroupOrder(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.eventListeners = {};
  }

  // Utility methods
  isGroupLeader(groupOrder: GroupOrder, currentUserId: string): boolean {
    return groupOrder.groupLeaderId === currentUserId;
  }

  canModifyOrder(groupOrder: GroupOrder): boolean {
    return groupOrder.status === 'active';
  }

  canPlaceOrder(groupOrder: GroupOrder, currentUserId: string): boolean {
    return this.isGroupLeader(groupOrder, currentUserId) && 
           (groupOrder.status === 'active' || groupOrder.status === 'locked') &&
           groupOrder.participants.length > 0 &&
           groupOrder.finalOrder.length > 0;
  }

  getTotalItemCount(groupOrder: GroupOrder): number {
    return groupOrder.participants.reduce((total, participant) => {
      return total + participant.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0);
    }, 0);
  }

  getParticipantByUserId(groupOrder: GroupOrder, userId: string): Participant | undefined {
    return groupOrder.participants.find(p => p.userId === userId);
  }

  formatJoinCode(joinCode: string): string {
    // Format join code for display (e.g., ABC-123 becomes ABC-123)
    return joinCode.toUpperCase().replace(/(.{3})(.{3})/, '$1-$2');
  }

  // Spending Limits Management
  async updateSpendingLimits(groupOrderId: string, spendingLimits: {
    enabled: boolean;
    defaultLimit?: number;
    participantLimits?: { [participantId: string]: number };
  }): Promise<GroupOrder> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${groupOrderId}/spending-limits`, { spendingLimits });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update spending limits');
    }
  }

  // Check if participant can add items without exceeding spending limit
  canAddItemsWithinLimit(groupOrder: GroupOrder, participantId: string, additionalAmount: number): {
    canAdd: boolean;
    currentSpending: number;
    limit?: number;
    exceedsBy?: number;
    isApproachingLimit?: boolean;
  } {
    const participant = groupOrder.participants.find(p => p._id === participantId);
    if (!participant) {
      return { canAdd: false, currentSpending: 0 };
    }

    // If spending limits are not enabled, allow all additions
    if (!groupOrder.spendingLimits?.enabled) {
      return { canAdd: true, currentSpending: participant.totalAmount };
    }

    const currentSpending = participant.totalAmount;
    const limit = participant.spendingLimit || 
                 groupOrder.spendingLimits.participantLimits?.[participantId] || 
                 groupOrder.spendingLimits.defaultLimit;

    if (!limit) {
      return { canAdd: true, currentSpending };
    }

    const newTotal = currentSpending + additionalAmount;
    const canAdd = newTotal <= limit;
    const exceedsBy = canAdd ? undefined : newTotal - limit;
    const isApproachingLimit = !canAdd ? false : (newTotal / limit) >= 0.8; // 80% threshold

    return {
      canAdd,
      currentSpending,
      limit,
      exceedsBy,
      isApproachingLimit
    };
  }

  // Get spending status for all participants
  getSpendingStatus(groupOrder: GroupOrder): { [participantId: string]: {
    currentSpending: number;
    limit?: number;
    percentageUsed?: number;
    status: 'within_limit' | 'approaching_limit' | 'exceeded_limit' | 'no_limit';
  }} {
    const result: any = {};

    groupOrder.participants.forEach(participant => {
      const currentSpending = participant.totalAmount;
      const limit = participant.spendingLimit || 
                   groupOrder.spendingLimits?.participantLimits?.[participant._id] || 
                   groupOrder.spendingLimits?.defaultLimit;

      if (!groupOrder.spendingLimits?.enabled || !limit) {
        result[participant._id] = {
          currentSpending,
          status: 'no_limit'
        };
        return;
      }

      const percentageUsed = (currentSpending / limit) * 100;
      let status: 'within_limit' | 'approaching_limit' | 'exceeded_limit';

      if (currentSpending > limit) {
        status = 'exceeded_limit';
      } else if (percentageUsed >= 80) {
        status = 'approaching_limit';
      } else {
        status = 'within_limit';
      }

      result[participant._id] = {
        currentSpending,
        limit,
        percentageUsed,
        status
      };
    });

    return result;
  }

  // Check spending status for a specific participant
  checkParticipantSpendingStatus(groupOrder: GroupOrder, participantId: string): {
    currentSpending: number;
    limit?: number;
    percentageUsed?: number;
    status: 'within_limit' | 'approaching_limit' | 'exceeded_limit' | 'no_limit';
  } {
    const participant = groupOrder.participants.find(p => p._id === participantId);
    if (!participant) {
      return {
        currentSpending: 0,
        status: 'no_limit'
      };
    }

    const currentSpending = participant.totalAmount;
    const limit = participant.spendingLimit || 
                 groupOrder.spendingLimits?.participantLimits?.[participantId] || 
                 groupOrder.spendingLimits?.defaultLimit;

    if (!groupOrder.spendingLimits?.enabled || !limit) {
      return {
        currentSpending,
        status: 'no_limit'
      };
    }

    const percentageUsed = (currentSpending / limit) * 100;
    let status: 'within_limit' | 'approaching_limit' | 'exceeded_limit';

    if (currentSpending > limit) {
      status = 'exceeded_limit';
    } else if (percentageUsed >= 80) {
      status = 'approaching_limit';
    } else {
      status = 'within_limit';
    }

    return {
      currentSpending,
      limit,
      percentageUsed,
      status
    };
  }

  // Update spending limit for a specific participant
  async updateParticipantSpendingLimit(groupOrderId: string, participantId: string, limit: number): Promise<GroupOrder> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${groupOrderId}/spending-limits/${participantId}`, { limit });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update participant spending limit');
    }
  }

  // Update payment structure for group order
  async updatePaymentStructure(groupOrderId: string, paymentStructure: PaymentStructure, customSplits?: { [participantId: string]: number }): Promise<GroupOrder> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${groupOrderId}/payment-structure`, { paymentStructure, customSplits });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update payment structure');
    }
  }

  // Get payment structure for group order
  // This method returns the current payment structure from the group order data
  async getPaymentStructure(groupOrderId: string): Promise<{
    paymentStructure: PaymentStructure;
    customSplits?: { [participantId: string]: number };
  }> {
    try {
      const groupOrder = await this.getGroupOrder(groupOrderId);
      return {
        paymentStructure: groupOrder.paymentStructure || 'pay_own', // Default to 'pay_own' if not set
        customSplits: groupOrder.customSplits
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get payment structure');
    }
  }
}

export const groupOrderingService = new GroupOrderingService();
export default groupOrderingService;
