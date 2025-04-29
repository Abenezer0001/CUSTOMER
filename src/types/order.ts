import { CartItem } from './index';

// Enhanced OrderStatus with more states
export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Payment status
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

// Order type
export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  status: OrderStatus | string; // Support both string literal and enum
  paymentStatus?: PaymentStatus | string;
  paymentMethod?: string;
  timestamp: Date;
  tableNumber: string;
  specialInstructions?: string;
  estimatedPreparationTime?: string;
  orderType?: 'DINE_IN' | 'TAKEAWAY';
  userId?: string;
  restaurantId?: string;
}

// Order creation request
export interface CreateOrderRequest {
  items: CartItem[];
  tableNumber: string;
  specialInstructions?: string;
  userId?: string;
}

// Order update request
export interface UpdateOrderRequest {
  id: string;
  status?: OrderStatus | string;
  paymentStatus?: PaymentStatus | string;
  tip?: number;
}

// Order response (for API calls)
export interface OrderResponse {
  success: boolean;
  data?: Order;
  message?: string;
}

// Order list response (for API calls)
export interface OrderListResponse {
  success: boolean;
  data?: Order[];
  total?: number;
  message?: string;
} 