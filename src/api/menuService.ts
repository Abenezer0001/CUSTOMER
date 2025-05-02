import axios from 'axios';

// Base URL for API requests
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Types
export interface Category {
  _id: string;
  name: string;
  description: string;
  image: string;
  restaurantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  _id: string;
  name: string;
  description: string;
  categoryId: string;
  restaurantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  subcategoryId: string;
  restaurantId: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Restaurant {
  _id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  image: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  _id?: string;
  orderNumber?: string;
  restaurantId: string;
  tableId: string;
  userId: string;
  items: OrderItem[];
  status?: string;
  paymentStatus?: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  orderType: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  menuItem: string;
  name: string;
  quantity: number;
  price: number;
  subtotal?: number;
  specialInstructions?: string;
}

// API functions
export const getCategories = async (restaurantId?: string): Promise<Category[]> => {
  try {
    const url = restaurantId 
      ? `${API_BASE_URL}/categories?restaurantId=${restaurantId}` 
      : `${API_BASE_URL}/categories`;
    const response = await axios.get(url);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const getSubcategories = async (categoryId?: string): Promise<Subcategory[]> => {
  try {
    const url = categoryId 
      ? `${API_BASE_URL}/subcategories?categoryId=${categoryId}` 
      : `${API_BASE_URL}/subcategories`;
    const response = await axios.get(url);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return [];
  }
};

export const getMenuItems = async (
  restaurantId?: string, 
  categoryId?: string, 
  subcategoryId?: string
): Promise<MenuItem[]> => {
  try {
    let url = `${API_BASE_URL}/menuitems`;
    const params = new URLSearchParams();
    
    if (restaurantId) params.append('restaurantId', restaurantId);
    if (categoryId) params.append('categoryId', categoryId);
    if (subcategoryId) params.append('subcategoryId', subcategoryId);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }
};

export const getRestaurant = async (restaurantId: string): Promise<Restaurant | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/restaurants/${restaurantId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return null;
  }
};

export const createOrder = async (orderData: Order): Promise<Order | null> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/orders`, orderData);
    return response.data;
  } catch (error) {
    console.error('Error creating order:', error);
    return null;
  }
};

export const updateOrderStatus = async (orderId: string, status: string): Promise<Order | null> => {
  try {
    const response = await axios.patch(`${API_BASE_URL}/orders/${orderId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating order status:', error);
    return null;
  }
};

export const cancelOrder = async (orderId: string, reason: string): Promise<Order | null> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/orders/${orderId}/cancel`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error cancelling order:', error);
    return null;
  }
}; 