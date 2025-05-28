import { Order, CartItem, OrderStatus, PaymentStatus } from '@/types';
import { toast } from 'sonner';
import { AuthService } from './AuthService';
import apiClient from '@/api/apiClient';

// Extract base URL without any trailing /api to prevent double prefixes
let API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// Remove any trailing /api if present to avoid double prefix
if (API_BASE.endsWith('/api')) {
  API_BASE = API_BASE.slice(0, -4);
}
const API_URL = `${API_BASE}/api`;
console.log('Order Service API URL:', API_URL);

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const OrderService = {
  // Create a new order
  createOrder: async (items: CartItem[], tableNumber: string): Promise<Order> => {
    await delay(1200); // Simulate network delay
    
    // Calculate order details
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.15; // Assuming 15% tax
    const total = subtotal + tax;
    
    // Create order object
    const order: Order = {
      id: 'order-' + Date.now(),
      items: [...items],
      subtotal,
      tax,
      total,
      status: OrderStatus.PREPARING,
      paymentStatus: PaymentStatus.PENDING,
      timestamp: new Date(),
      tableNumber
    };
    
    // In a real app, we would send the order to the server here
    // For now, we'll save it in localStorage
    const existingOrdersString = localStorage.getItem('orders');
    const existingOrders: Order[] = existingOrdersString ? JSON.parse(existingOrdersString) : [];
    
    localStorage.setItem('orders', JSON.stringify([order, ...existingOrders]));
    
    // Notify user
    toast.success('Order placed successfully!');
    
    return order;
  },
  
  // Get all orders for the current user
  getOrders: async (): Promise<Order[]> => {
    await delay(800); // Simulate network delay
    
    // In a real app, we would fetch orders from the server
    // For now, we'll retrieve them from localStorage
    const ordersString = localStorage.getItem('orders');
    return ordersString ? JSON.parse(ordersString) : [];
  },
  
  // Get order by ID
  getOrderById: async (orderId: string): Promise<Order | null> => {
    await delay(500); // Simulate network delay
    
    const ordersString = localStorage.getItem('orders');
    const orders: Order[] = ordersString ? JSON.parse(ordersString) : [];
    
    const order = orders.find(order => order.id === orderId);
    return order || null;
  },
  
  // Update order status
  updateOrderStatus: async (orderId: string, status: OrderStatus): Promise<Order | null> => {
    await delay(700); // Simulate network delay
    
    // Get orders from localStorage
    const ordersString = localStorage.getItem('orders');
    const orders: Order[] = ordersString ? JSON.parse(ordersString) : [];
    
    // Find and update the order
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return { ...order, status };
      }
      return order;
    });
    
    // Save updated orders
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    
    // Return the updated order
    const updatedOrder = updatedOrders.find(order => order.id === orderId);
    return updatedOrder || null;
  },
  
  // Cancel an order
  cancelOrder: async (orderId: string): Promise<boolean> => {
    await delay(800); // Simulate network delay
    
    // Get orders from localStorage
    const ordersString = localStorage.getItem('orders');
    const orders: Order[] = ordersString ? JSON.parse(ordersString) : [];
    
    // Remove the order
    const updatedOrders = orders.filter(order => order.id !== orderId);
    
    // Check if any order was removed
    if (updatedOrders.length === orders.length) {
      toast.error('Order not found');
      return false;
    }
    
    // Save updated orders
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    toast.success('Order cancelled successfully');
    
    return true;
  },
  
  // Get active orders (preparing or ready status)
  getActiveOrders: async (): Promise<Order[]> => {
    await delay(600); // Simulate network delay
    
    const ordersString = localStorage.getItem('orders');
    const orders: Order[] = ordersString ? JSON.parse(ordersString) : [];
    
    return orders.filter(order => 
      order.status === OrderStatus.PREPARING || order.status === OrderStatus.READY
    );
  },
  
  // Get completed orders (delivered or completed status)
  getCompletedOrders: async (): Promise<Order[]> => {
    await delay(600); // Simulate network delay
    
    const ordersString = localStorage.getItem('orders');
    const orders: Order[] = ordersString ? JSON.parse(ordersString) : [];
    
    return orders.filter(order => 
      order.status === OrderStatus.DELIVERED || order.status === OrderStatus.COMPLETED
    );
  },

  // Request the bill for an order
  requestBill: async (orderId: string): Promise<Order | null> => {
    await delay(1000); // Simulate network delay
    
    // Get orders from localStorage
    const ordersString = localStorage.getItem('orders');
    const orders: Order[] = ordersString ? JSON.parse(ordersString) : [];
    
    // Find the order
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
      toast.error('Order not found');
      return null;
    }
    
    // Update the order status
    const updatedOrder = { 
      ...orders[orderIndex],
      status: OrderStatus.COMPLETED
    };
    
    const updatedOrders = [...orders];
    updatedOrders[orderIndex] = updatedOrder;
    
    // Save updated orders
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    toast.success('Bill requested successfully');
    
    return updatedOrder;
  },
  
  // Add tip to an order
  addTip: async (orderId: string, tipAmount: number): Promise<Order | null> => {
    await delay(700); // Simulate network delay
    
    // Get orders from localStorage
    const ordersString = localStorage.getItem('orders');
    const orders: Order[] = ordersString ? JSON.parse(ordersString) : [];
    
    // Find the order
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
      toast.error('Order not found');
      return null;
    }
    
    // Update the order with tip
    const order = orders[orderIndex];
    const tipPercentage = (tipAmount / 100);
    const tipValue = order.subtotal * tipPercentage;
    
    const updatedOrder = { 
      ...order,
      tip: tipValue,
      total: order.subtotal + order.tax + tipValue
    };
    
    const updatedOrders = [...orders];
    updatedOrders[orderIndex] = updatedOrder;
    
    // Save updated orders
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    toast.success(`${tipAmount}% tip added successfully`);
    
    return updatedOrder;
  },
  
  // Process payment for an order
  processPayment: async (orderId: string, paymentMethod: string): Promise<Order | null> => {
    await delay(1500); // Simulate network delay
    
    // Get orders from localStorage
    const ordersString = localStorage.getItem('orders');
    const orders: Order[] = ordersString ? JSON.parse(ordersString) : [];
    
    // Find the order
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
      toast.error('Order not found');
      return null;
    }
    
    // Update the order with payment status
    const updatedOrder = { 
      ...orders[orderIndex],
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: paymentMethod
    };
    
    const updatedOrders = [...orders];
    updatedOrders[orderIndex] = updatedOrder;
    
    // Save updated orders
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    toast.success('Payment processed successfully');
    
    return updatedOrder;
  }
}; 