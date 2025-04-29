import { MenuItemType } from './MenuItem';

export interface OrderItem {
  _id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: {
    name: string;
    options: {
      name: string;
      price: number;
    }[];
  }[];
  specialInstructions?: string;
  menuItem?: MenuItemType;
}

export interface Order {
  _id: string;
  userId: string;
  venueId: string;
  restaurantId: string;
  tableNumber: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  totalAmount: number;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = Order['status']; 