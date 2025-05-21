import { CartItem } from './index';

// Enhanced OrderStatus with more states - using uppercase values to match backend
export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Payment status - using uppercase values to match backend
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

// Order type
export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEOUT = 'TAKEOUT'
}

export interface OrderItem {
  _id?: string;
  menuItem: string; // ID of the menu item
  menuItemId?: string; // Legacy support
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  modifiers?: {
    name: string;
    options?: {
      name: string;
      price: number;
    }[];
    price?: number;
  }[];
  specialInstructions?: string;
}

export interface Order {
  id: string;
  _id?: string; // For API compatibility
  orderNumber?: string;
  userId?: string;
  restaurantId?: string;
  tableId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  tip: number;
  serviceFee?: number;
  total: number;
  status: string | OrderStatus;
  paymentStatus?: string | PaymentStatus;
  orderType?: string | OrderType;
  specialInstructions?: string;
  timestamp: Date;
}

// API response type for order creation
export interface OrderResponseData {
  _id: string;
  orderNumber: string;
  restaurantId: string;
  tableId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip: number;
  serviceFee: number;
  total: number;
  status: string;
  paymentStatus: string;
  orderType: string;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}