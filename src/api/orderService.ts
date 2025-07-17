import { API_BASE_URL } from '@/config/constants';
import { CartItem, Order, OrderStatus, PaymentStatus, CartItemModifier } from '@/types';
import apiClient from './apiClient';
import authService, { getEffectiveToken } from '@/api/authService';

// Order type enum to match API
export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEOUT = 'TAKEOUT',
  DELIVERY = 'DELIVERY'
}

// Constants for calculations
const TAX_RATE = 0.08;
const SERVICE_FEE_RATE = 0.05;

// Order item interface for API
export interface OrderItem {
  menuItem: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  specialInstructions?: string;
  modifiers?: Array<{
    name: string;
    price: number;
  }>;
}

// Order data interface for API
export interface OrderData {
  restaurantId: string;
  tableId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  serviceFee: number;
  tip: number;
  total: number;
  orderType: OrderType;
  specialInstructions?: string;
}

/**
 * Interface for decoded JWT payload
 */
interface JWTPayload {
  id: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

/**
 * Response interface for fetching multiple orders
 */
interface OrdersResponse {
  success: boolean;
  data: {
    orders: OrderResponseData[];
    pagination: {
      total: number;
      limit: number;
      page: number;
      pages: number;
    };
  };
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Order data returned from API
 */
export interface OrderResponseData {
  _id: string;
  orderNumber: string;
  restaurantId: string;
  tableId: string;
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  tax: number;
  serviceFee: number;
  tip: number;
  total: number;
  orderType: OrderType;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response interface for single order operations
 */
interface OrderResponse {
  success: boolean;
  data: OrderResponseData;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Response interface for cancelling an order
 */
interface CancelOrderResponse {
  success: boolean;
  data: {
    _id: string;
    status: OrderStatus;
    updatedAt: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Response interface for updating order status
 */
interface UpdateOrderStatusResponse {
  success: boolean;
  data: {
    _id: string;
    status: OrderStatus;
    updatedAt: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Response interface for updating payment status
 */
interface UpdatePaymentStatusResponse {
  success: boolean;
  data: {
    _id: string;
    paymentStatus: PaymentStatus;
    updatedAt: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

// Extract restaurant ID safely from table ID or use default
// Note: This is a fallback function in case restaurantId isn't provided directly
export const extractRestaurantIdFromTableId = (tableId: string): string => {
  if (!tableId || tableId.indexOf('-') === -1) {
    throw new Error('Invalid table ID format - unable to extract restaurant ID');
  }
  return tableId.split('-')[0];
};

/**
 * Fetch restaurant ID from table ID by calling the backend API
 * @param tableId - The table ID to fetch restaurant information for
 * @returns Promise resolving to the restaurant ID
 */
export const getRestaurantIdFromTableId = async (tableId: string): Promise<string> => {
  try {
    console.log('Fetching restaurant ID for table:', tableId);
    
    const response = await fetch(`${API_BASE_URL}/api/tables/${tableId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error(`Table API error: ${response.status} ${response.statusText}`);
      
      // If table doesn't exist (404), try to get restaurant ID from current URL
      if (response.status === 404) {
        console.log('Table not found, attempting to extract restaurant ID from URL context');
        
        // Try to get restaurant ID from current URL path
        const currentPath = window.location.pathname;
        const restaurantMatch = currentPath.match(/\/restaurant\/([^\/]+)/);
        
        if (restaurantMatch && restaurantMatch[1]) {
          console.log('Found restaurant ID in URL:', restaurantMatch[1]);
          return restaurantMatch[1];
        }
        
        // Try to get from localStorage if set by previous navigation
        const storedRestaurantId = localStorage.getItem('currentRestaurantId');
        if (storedRestaurantId) {
          console.log('Found restaurant ID in localStorage:', storedRestaurantId);
          return storedRestaurantId;
        }
        
        // Last resort: check if there's a default restaurant in sessionStorage
        const tableData = sessionStorage.getItem('tableData');
        if (tableData) {
          try {
            const parsed = JSON.parse(tableData);
            if (parsed.venue?.restaurant?._id) {
              console.log('Found restaurant ID in stored table data:', parsed.venue.restaurant._id);
              return parsed.venue.restaurant._id;
            }
          } catch (e) {
            console.log('Could not parse stored table data');
          }
        }
        
        // If we still can't find it, show a user-friendly error
        throw new Error(`Table ${tableId} not found. Please scan a valid QR code or contact staff for assistance.`);
      }
      
      throw new Error(`Failed to fetch table information: ${response.status} ${response.statusText}`);
    }
    
    const tableData = await response.json();
    console.log('Table data received:', tableData);
    
    // Try multiple possible paths for restaurant ID
    let restaurantId = null;
    
    // Direct restaurantId field
    if (tableData.restaurantId) {
      restaurantId = typeof tableData.restaurantId === 'string' 
        ? tableData.restaurantId 
        : tableData.restaurantId._id || tableData.restaurantId.id;
    }
    
    // Restaurant object with _id
    if (!restaurantId && tableData.restaurant) {
      restaurantId = typeof tableData.restaurant === 'string'
        ? tableData.restaurant
        : tableData.restaurant._id || tableData.restaurant.id;
    }
    
    // Venue.restaurant path
    if (!restaurantId && tableData.venue?.restaurant) {
      restaurantId = typeof tableData.venue.restaurant === 'string'
        ? tableData.venue.restaurant
        : tableData.venue.restaurant._id || tableData.venue.restaurant.id;
    }
    
    // Venue.restaurantId path
    if (!restaurantId && tableData.venue?.restaurantId) {
      restaurantId = typeof tableData.venue.restaurantId === 'string'
        ? tableData.venue.restaurantId
        : tableData.venue.restaurantId._id || tableData.venue.restaurantId.id;
    }
    
    if (!restaurantId) {
      console.error('Restaurant ID not found in table data. Available fields:', Object.keys(tableData));
      console.error('Full table data structure:', JSON.stringify(tableData, null, 2));
      throw new Error(`Unable to determine restaurant ID from table: ${tableId}. Table data structure may be incomplete.`);
    }
    
    // Store the restaurant ID for future use
    localStorage.setItem('currentRestaurantId', restaurantId);
    
    console.log('Successfully extracted restaurant ID:', restaurantId);
    return restaurantId;
  } catch (error) {
    console.error('Error fetching restaurant ID from table:', error);
    
    // Instead of falling back to hardcoded ID, throw the error
    throw new Error(error instanceof Error ? error.message : `Unable to determine restaurant ID from table: ${tableId}`);
  }
};

// Helper function to generate a stable ID from modifier name
export const generateModifierId = (name: string): string => {
  return `mod_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
};

// Converts API order response to frontend Order type
export const convertApiOrderToFrontend = (apiOrder: OrderResponseData): Order => ({
  id: apiOrder._id,
  orderNumber: apiOrder.orderNumber,
  items: apiOrder.items.map(item => ({
    id: item.menuItem,
    menuItemId: item.menuItem,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    specialInstructions: item.specialInstructions,
    modifiers: item.modifiers?.map(mod => ({
      id: generateModifierId(mod.name),
      name: mod.name,
      price: mod.price
    }))
  })),
  subtotal: apiOrder.subtotal,
  tax: apiOrder.tax,
  serviceFee: apiOrder.serviceFee,
  tip: apiOrder.tip,
  total: apiOrder.total,
  status: apiOrder.status,
  paymentStatus: apiOrder.paymentStatus,
  timestamp: new Date(apiOrder.createdAt),
  tableId: apiOrder.tableId,
  specialInstructions: apiOrder.specialInstructions
});

/**
 * Utility function to parse cookies into an object
 * @returns Object with cookie name-value pairs
 */
const parseCookies = (): { [key: string]: string } => {
  try {
    // Debug the raw cookie string
    console.log('Raw document.cookie:', document.cookie);
    
    // Skip parsing if cookie string is empty
    if (!document.cookie) {
      console.log('No cookies found in document.cookie');
      return {};
    }
    
    const cookies = document.cookie
      .split(';')
      .map(c => c.trim())
      .reduce((acc: {[key: string]: string}, curr) => {
        // More robust parsing - handle edge cases
        if (!curr) return acc;
        
        const eqPos = curr.indexOf('=');
        if (eqPos === -1) return acc;
        
        const key = curr.substring(0, eqPos).trim();
        const value = curr.substring(eqPos + 1).trim();
        
        if (key && value) acc[key] = value;
        return acc;
      }, {});
      
    // Debug the parsed cookies
    console.log('Parsed cookies:', cookies);
    return cookies;
  } catch (error) {
    console.error('Error parsing cookies:', error);
    return {};
  }
};

// Test helper functions - only included in development
if (process.env.NODE_ENV === 'development') {
  // Expose functions needed for testing
  (window as any).parseCookies = parseCookies;
  
  (window as any).validateJwtToken = (token: string) => {
    try {
      // Split token and validate format
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format: missing segments');
      }
      
      const [, payload] = tokenParts;
      if (!payload) throw new Error('Invalid token format: missing payload');
      
      // Add padding to base64 if needed
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      
      const decodedPayload = JSON.parse(atob(padded)) as JWTPayload;
      
      // Validate required fields
      if (!decodedPayload.id || !decodedPayload.exp || !decodedPayload.role) {
        throw new Error('Invalid token payload: missing required fields');
      }
      
      // Check if role is allowed
      if (!['customer', 'admin', 'staff'].includes(decodedPayload.role)) {
        throw new Error('Invalid token payload: invalid role');
      }
      
      const tokenExpiry = decodedPayload.exp * 1000;
      const currentTime = Date.now();
      
      return {
        isAuthenticated: tokenExpiry > currentTime,
        userId: decodedPayload.id,
        role: decodedPayload.role,
        expiresIn: Math.floor((tokenExpiry - currentTime) / 1000)
      };
      
    } catch (error) {
      console.warn('Token validation failed:', error instanceof Error ? error.message : 'Unknown error');
      return {
        isAuthenticated: false,
        userId: null,
        role: null,
        expiresIn: 0
      };
    }
  };
  
  // Only expose parseCookies and validateJwtToken here
  console.log('Initial test helper functions initialized in development mode');
}

/**
 * Helper function to prepare request headers with auth token
 * Tries multiple methods to get the authentication token
 * @returns Object with appropriate headers including auth token if available
 */
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  // Get token using authService's method first
  let token = getEffectiveToken();
  
  // If no token from authService, try to get from localStorage directly
  if (!token || token === 'http-only-cookie-present') {
    token = localStorage.getItem('auth_token');
    console.log('Fallback: Got token from localStorage:', token ? 'Token found' : 'No token');
  }
  
  // If still no token, try to parse cookies manually
  if (!token || token === 'http-only-cookie-present') {
    try {
      const cookies = document.cookie.split(';').map(c => c.trim());
      
      // Check for various token cookie names
      const tokenCookieNames = ['access_token=', 'auth_token=', 'jwt=', 'token='];
      
      for (const cookieName of tokenCookieNames) {
        const cookieMatch = cookies.find(cookie => cookie.startsWith(cookieName));
        if (cookieMatch) {
          token = cookieMatch.split('=')[1];
          console.log(`Found token in ${cookieName.replace('=', '')} cookie`);
          break;
        }
      }
    } catch (error) {
      console.error('Error parsing cookies for token:', error);
    }
  }
  
  // Set Authorization header if we have a valid token
  if (token && token !== 'http-only-cookie-present' && token.length > 10) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('Added Authorization header with token (length:', token.length, ')');
  } else {
    console.log('No valid auth token available for Authorization header');
    
    // If we have any cookies at all, log them for debugging
    if (document.cookie) {
      console.log('Available cookies (for debugging):', document.cookie.split(';').map(c => c.trim().split('=')[0]));
    }
  }
  
  return headers;
};

/**
 * Creates a new order in the system
 * 
 * @param cartItems - Array of cart items to be included in the order
 * @param tableId - ID of the table where the order is placed
 * @param restaurantId - ID of the restaurant
 * @param customOrderData - Optional custom order data
 * @param navigate - Optional navigation function for redirecting if auth fails
 * @returns Promise resolving to the created order data
 * @throws Error if API request fails
 */
export const createOrder = async (
  cartItems: CartItem[], 
  tableId: string, 
  restaurantId: string,
  customOrderData?: OrderData,
  navigate?: (path: string, options?: any) => void
): Promise<OrderResponseData> => {
  try {
    console.log('createOrder called with credentials included');
    console.log('tableId:', tableId);
    console.log('restaurantId:', restaurantId);
    
    // Validate that we have a proper restaurant ID
    if (!restaurantId || restaurantId === 'InSeat') {
      // Get restaurant ID from table ID using API call
      try {
        restaurantId = await getRestaurantIdFromTableId(tableId);
        console.log('Fetched restaurant ID from table API:', restaurantId);
      } catch (error) {
        console.error('Failed to get restaurant ID from table:', error);
        throw new Error('Unable to determine restaurant ID from table: ' + tableId);
      }
    }
    
    // Check authentication status first
    const token = getEffectiveToken();
    
    // If we have an HTTP-only cookie or no token, try to get a valid token
    if (!token || token === 'http-only-cookie-present') {
      console.log('No explicit token found, attempting to refresh or check auth status...');
      
      // First try to refresh the token
      const refreshSuccess = await authService.refreshToken();
      
      // If refresh fails, try to check auth status directly with the API
      if (!refreshSuccess) {
        try {
          // Try to get user data from /auth/me endpoint
          const authResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (authResponse.ok) {
            const userData = await authResponse.json();
            console.log('Auth check successful:', userData);
            
            // If we got user data, we're authenticated despite not having a token
            if (userData.success && userData.user) {
              console.log('User is authenticated via cookies, proceeding with order');
              // Continue with order creation
            } else {
              throw new Error('Authentication check failed');
            }
          } else {
            throw new Error('Authentication check failed');
          }
        } catch (authError) {
          console.log('Auth check failed, redirecting to login');
          if (cartItems.length > 0) {
            localStorage.setItem('pendingCart', JSON.stringify({
              items: cartItems,
              tableId
            }));
          }
          
          if (navigate) {
            navigate('/login', { state: { from: '/cart', tableId } });
          } else {
            window.location.href = `/login?redirect=${encodeURIComponent('/cart')}&tableId=${tableId}`;
          }
          throw new Error('Authentication required. Please log in to place an order.');
        }
      }
    }
    
    // Get or generate a device ID - but only for guest users
    const getDeviceId = (): string | null => {
      // Only return device ID for guest users - first check if we have an auth token
      const authToken = getEffectiveToken();
      
      // If we have a valid token, we're authenticated and don't need device ID
      if (authToken && authToken !== 'http-only-cookie-present') {
        console.log('User is authenticated with token, skipping device ID');
        return null;
      }
      
      // Check localStorage for existing device ID
      let deviceId = localStorage.getItem('device_id');
      
      if (!deviceId) {
        // Generate a new device ID if none exists
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        localStorage.setItem('device_id', deviceId);
      }
      
      return deviceId;
    };
    
    const deviceId = getDeviceId();
    console.log('Device ID for order:', deviceId ? 'Generated for guest user' : 'Skipped for authenticated user');
    
    // Prepare order data
    let formattedOrderData: OrderData;

    if (customOrderData) {
      formattedOrderData = customOrderData;
    } else {
      const subtotal = cartItems.reduce((total, item) => {
        if (item.getItemTotal) {
          return total + item.getItemTotal();
        }
        
        const modifierPrice = item.modifiers ? 
          item.modifiers.reduce((sum, mod) => sum + mod.price, 0) : 0;
        return total + ((item.price + modifierPrice) * item.quantity);
      }, 0);
      
      const tax = subtotal * TAX_RATE;
      const serviceFee = subtotal * SERVICE_FEE_RATE;
      const tipAmount = 0;
      const total = subtotal + tax + serviceFee + tipAmount;

      const formattedItems = cartItems.map(item => {
        const itemTotal = item.getItemTotal 
          ? item.getItemTotal() 
          : (item.price * item.quantity) + (item.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0);

        // Clean the menuItem ID to extract only the ObjectId part
        let menuItemId = item.menuItemId || item.id;
        
        // Remove any timestamp suffix that might be appended
        if (menuItemId && menuItemId.includes('-')) {
          menuItemId = menuItemId.split('-')[0];
        }
        
        // Ensure it's a valid ObjectId format (24 hex characters)
        if (menuItemId && menuItemId.length > 24) {
          menuItemId = menuItemId.substring(0, 24);
        }

        return {
          menuItem: menuItemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: itemTotal,
          specialInstructions: item.specialInstructions || '',
          modifiers: item.modifiers?.map(mod => ({
            name: mod.name,
            price: mod.price
          })) || []
        };
      });
      
      formattedOrderData = {
        restaurantId,
        tableId,
        items: formattedItems,
        subtotal,
        tax,
        serviceFee,
        tip: tipAmount,
        total,
        orderType: OrderType.DINE_IN,
        specialInstructions: ''
      };
    }

    // Prepare complete order data with device ID only for guest users
    const completeOrderData: any = {
      ...formattedOrderData,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    
    // Only include device ID for guest users
    if (deviceId) {
      completeOrderData.deviceId = deviceId;
      console.log('Including deviceId for guest user:', deviceId);
    } else {
      console.log('Authenticated user - not including deviceId');
    }
    
    // Log data preparation
    console.log('Prepared order data:', {
      orderNumber: completeOrderData.orderNumber,
      restaurantId: completeOrderData.restaurantId,
      hasDeviceId: Boolean(completeOrderData.deviceId),
      isGuestUser: Boolean(deviceId)
    });

    // Get fresh headers after potential token refresh
    const headers = getAuthHeaders();
    
    console.log('Sending order request with credentials included');
    console.log('Request headers prepared:', {
      hasAuthorization: !!(headers as any).Authorization,
      contentType: headers['Content-Type']
    });
    
    // Log the request details for debugging
    console.log('Order request details:', {
      url: `${API_BASE_URL}/orders`,
      method: 'POST',
      headers: headers,
      body: JSON.stringify(completeOrderData).substring(0, 100) + '...',
      withCredentials: true
    });
    
    // Send the request with credentials: 'include' to send cookies
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(completeOrderData),
      credentials: 'include' // This ensures cookies are sent automatically
    });
    
    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || `Order creation failed with status: ${response.status}`;
      } catch (e) {
        errorMessage = `Order creation failed with status: ${response.status}`;
        console.error('Could not parse error response:', e);
      }
      
      // Special handling for authentication errors
      if (response.status === 401) {
        console.log('Authentication required - redirecting to login');
        console.log('Server requires authentication despite cookies being sent automatically');
        
        // Save cart state before redirect
        if (cartItems.length > 0) {
          localStorage.setItem('pendingCart', JSON.stringify({
            items: cartItems,
            tableId
          }));
        }
        
        // Use navigate function if provided, otherwise use default redirect
        if (navigate) {
          navigate('/login', { state: { from: '/cart', tableId } });
        } else {
          // Default fallback redirect
          if (typeof window !== 'undefined') {
            window.location.href = `/login?redirect=${encodeURIComponent('/cart')}&tableId=${tableId}`;
          }
        }
        
        throw new Error('Authentication required. Please log in to place an order.');
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const orderData = data.data || data; // Handle different response formats
    console.log('Order created successfully:', orderData);
    return orderData;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error instanceof Error ? error : new Error('An unexpected error occurred during order creation.');
  }
};

/**
 * Fetches all orders for the currently authenticated user
 * 
 * @returns Promise resolving to orders data with pagination
 * @throws Error if API request fails
 */
export const fetchUserOrders = async (): Promise<OrdersResponse['data']> => {
  try {
    console.log('Fetching user orders with credentials included');
    
    const response = await fetch(`${API_BASE_URL}/api/orders/my-orders`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include' // Send cookies
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error(`Failed to fetch orders: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return {
        orders: data,
        pagination: {
          total: data.length,
          limit: data.length,
          page: 1,
          pages: 1
        }
      };
    } else if (data.success) {
      return data.data;
    } else if (data.orders) {
      return data;
    }
    
    return {
      orders: [],
      pagination: { total: 0, limit: 10, page: 1, pages: 0 }
    };
    
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch orders');
  }
};

/**
 * Cancels an existing order
 * 
 * @param orderId - ID of the order to cancel
 * @returns Promise that resolves when the order is cancelled
 * @throws Error if API request fails
 */
export const cancelOrder = async (orderId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to cancel order: ${response.status}`);
    }
    
    console.log('Order cancelled successfully');
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error instanceof Error ? error : new Error('Failed to cancel order');
  }
};

/**
 * Retrieves an order by its ID
 * 
 * @param orderId - ID of the order to retrieve
 * @returns Promise resolving to the order data
 * @throws Error if API request fails
 */
export const getOrderById = async (orderId: string): Promise<Order> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch order: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle different response formats
    if (data.success) {
      return convertApiOrderToFrontend(data.data);
    } else if (data._id) {
      return convertApiOrderToFrontend(data);
    }
    
    throw new Error('Invalid order data received');
    
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch order');
  }
};

/**
 * Updates the status of an existing order
 * 
 * @param orderId - ID of the order to update
 * @param status - New status to set
 * @returns Promise resolving to the updated order status data
 * @throws Error if API request fails
 */
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus
): Promise<UpdateOrderStatusResponse['data']> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update order status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data;
    
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error instanceof Error ? error : new Error('Failed to update order status');
  }
};

/**
 * Updates the payment status of an existing order
 * 
 * @param orderId - ID of the order to update
 * @param paymentStatus - New payment status to set
 * @returns Promise resolving to the updated payment status data
 * @throws Error if API request fails
 */
export const updatePaymentStatus = async (
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<UpdatePaymentStatusResponse['data']> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/payment`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ paymentStatus }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update payment status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data;
    
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error instanceof Error ? error : new Error('Failed to update payment status');
  }
};

// Export additional test helpers after all functions are defined
if (process.env.NODE_ENV === 'development') {
  (window as any).createOrder = createOrder;
  console.log('Additional test helper functions (createOrder) initialized in development mode');
}
