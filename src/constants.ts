// API Configuration
// Get API URL from environment variables with fallback to local development URL
const envApiUrl = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = envApiUrl;

// Log the API URL being used for debugging
console.log('Environment VITE_API_BASE_URL:', envApiUrl);
console.log('Using API base URL from main constants:', API_BASE_URL);

// Other application constants
export const APP_NAME = 'InSeat Menu';
export const DEFAULT_LOCALE = 'en-US';
export const CURRENCY_FORMAT = 'USD';

// Local storage keys
export const STORAGE_KEYS = {
  TABLE_INFO: 'tableInfo',
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'user_info',
  FAVORITES: 'favorites',
  CART: 'cart'
};

// Animation durations
export const ANIMATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500
};

// Routes
export const ROUTES = {
  HOME: '/',
  MENU: '/menu',
  CATEGORY: '/category',
  ITEM: '/menu',
  SCAN: '/scan',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDERS: '/my-orders',
  CALL_WAITER: '/call-waiter',
  BILL: '/bill'
}; 