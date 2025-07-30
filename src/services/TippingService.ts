// Customer-facing Tipping Service for inseat-menu
import { api } from './api';
import { API_BASE_URL } from '../config/constants';

// Customer Tipping interfaces
export interface TipOption {
  percentage: number;
  amount: number;
  label: string;
  isDefault?: boolean;
}

export interface TipCalculation {
  orderAmount: number;
  tipPercentage: number;
  tipAmount: number;
  totalAmount: number;
  suggestedTips: TipOption[];
}

export interface TipSubmission {
  orderId: string;
  staffId?: string;
  tipAmount: number;
  tipPercentage: number;
  paymentMethod: 'card' | 'cash' | 'app_credit';
  message?: string;
  isAnonymous?: boolean;
}

export interface TipRecord {
  _id: string;
  orderId: string;
  customerId: string;
  staffId?: string;
  staffName?: string;
  restaurantId: string;
  amount: number;
  percentage: number;
  paymentMethod: string;
  message?: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  isAnonymous: boolean;
  createdAt: Date;
}

export interface StaffMember {
  _id: string;
  name: string;
  role: string;
  avatar?: string;
  rating?: number;
  totalTips?: number;
  isActive: boolean;
}

export interface TipHistory {
  tips: TipRecord[];
  totalTipped: number;
  averageTip: number;
  favoriteStaff: StaffMember[];
}

export interface RestaurantTippingSettings {
  isEnabled: boolean;
  minimumTipPercentage: number;
  maximumTipPercentage: number;
  suggestedPercentages: number[];
  allowCustomAmount: boolean;
  allowCashTips: boolean;
  allowStaffSelection: boolean;
  tippingMessage?: string;
}

class TippingService {
  private baseUrl = `${API_BASE_URL}/api/v1/tipping`;

  // Get tipping settings for restaurant
  async getRestaurantTippingSettings(restaurantId: string): Promise<RestaurantTippingSettings> {
    try {
      const response = await api.get(`${this.baseUrl}/restaurants/${restaurantId}/settings`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tipping settings');
    }
  }

  // Calculate tip suggestions for order
  async calculateTipSuggestions(orderId: string, customAmount?: number): Promise<TipCalculation> {
    try {
      const params = customAmount ? { customAmount } : {};
      const response = await api.get(`${this.baseUrl}/orders/${orderId}/calculate`, { params });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to calculate tip suggestions');
    }
  }

  // Get available staff members for tipping
  async getAvailableStaff(restaurantId: string): Promise<StaffMember[]> {
    try {
      const response = await api.get(`${this.baseUrl}/restaurants/${restaurantId}/staff`);
      return response.data.data.staff;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch staff members');
    }
  }

  // Submit tip
  async submitTip(tipData: TipSubmission): Promise<{ success: boolean; tipRecord: TipRecord; message: string }> {
    try {
      const response = await api.post(`${this.baseUrl}/submit`, tipData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to submit tip');
    }
  }

  // Get tip history for customer
  async getTipHistory(page: number = 1, limit: number = 10): Promise<{
    tips: TipRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      totalTipped: number;
      averageTip: number;
      tipCount: number;
    };
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/my-tips`, {
        params: { page, limit }
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tip history');
    }
  }

  // Get tip details
  async getTipDetails(tipId: string): Promise<TipRecord> {
    try {
      const response = await api.get(`${this.baseUrl}/tips/${tipId}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tip details');
    }
  }

  // Update tip (if still pending)
  async updateTip(tipId: string, updateData: Partial<TipSubmission>): Promise<TipRecord> {
    try {
      const response = await api.put(`${this.baseUrl}/tips/${tipId}`, updateData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update tip');
    }
  }

  // Cancel tip (if still pending)
  async cancelTip(tipId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`${this.baseUrl}/tips/${tipId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to cancel tip');
    }
  }

  // Process tip payment
  async processTipPayment(tipId: string, paymentMethodId?: string): Promise<{ 
    success: boolean; 
    paymentIntent?: string;
    message: string;
  }> {
    try {
      const response = await api.post(`${this.baseUrl}/tips/${tipId}/process-payment`, {
        paymentMethodId
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to process tip payment');
    }
  }

  // Get staff member details for tipping
  async getStaffDetails(staffId: string): Promise<{
    staff: StaffMember;
    recentFeedback: {
      rating: number;
      totalRatings: number;
      recentComments: string[];
    };
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/staff/${staffId}/details`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch staff details');
    }
  }

  // Submit staff feedback with tip
  async submitStaffFeedback(tipId: string, feedback: {
    rating: number;
    comment?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`${this.baseUrl}/tips/${tipId}/feedback`, feedback);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to submit feedback');
    }
  }

  // Get tipping statistics for customer
  async getMyTippingStats(): Promise<{
    totalTipped: number;
    averageTipPercentage: number;
    tipFrequency: number;
    favoriteRestaurants: {
      restaurantId: string;
      restaurantName: string;
      totalTipped: number;
      visitCount: number;
    }[];
    monthlyBreakdown: {
      month: string;
      amount: number;
      count: number;
    }[];
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/my-stats`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tipping statistics');
    }
  }

  // Check if tip is allowed for order
  async canTipOrder(orderId: string): Promise<{
    canTip: boolean;
    reason?: string;
    existingTip?: TipRecord;
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/orders/${orderId}/can-tip`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to check tip eligibility');
    }
  }

  // Get recommended tip amount based on order and history
  async getRecommendedTip(orderId: string): Promise<{
    recommendedPercentage: number;
    recommendedAmount: number;
    reason: string;
    confidence: number;
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/orders/${orderId}/recommended-tip`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get recommended tip');
    }
  }

  // Add tip to existing order
  async addTipToOrder(orderId: string, tipAmount: number, staffId?: string): Promise<{
    success: boolean;
    tipRecord: TipRecord;
    paymentRequired: boolean;
    paymentIntentId?: string;
  }> {
    try {
      const response = await api.post(`${this.baseUrl}/orders/${orderId}/add-tip`, {
        tipAmount,
        staffId
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add tip to order');
    }
  }

  // Validate tip amount
  validateTipAmount(orderAmount: number, tipAmount: number, settings: RestaurantTippingSettings): {
    isValid: boolean;
    error?: string;
    suggestedAmount?: number;
  } {
    if (tipAmount < 0) {
      return { isValid: false, error: 'Tip amount cannot be negative' };
    }

    const tipPercentage = (tipAmount / orderAmount) * 100;

    if (tipPercentage < settings.minimumTipPercentage) {
      return { 
        isValid: false, 
        error: `Minimum tip is ${settings.minimumTipPercentage}%`,
        suggestedAmount: Math.ceil((orderAmount * settings.minimumTipPercentage) / 100)
      };
    }

    if (tipPercentage > settings.maximumTipPercentage) {
      return { 
        isValid: false, 
        error: `Maximum tip is ${settings.maximumTipPercentage}%`,
        suggestedAmount: Math.floor((orderAmount * settings.maximumTipPercentage) / 100)
      };
    }

    return { isValid: true };
  }

  // Format tip amount for display
  formatTipAmount(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }
}

export const tippingService = new TippingService();
export default tippingService;
