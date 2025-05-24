// API Base URL
// Get API URL from environment variables, default to production URL
const envApiUrl = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = envApiUrl || 'https://api.inseat.achievengine.com/api';

// Log the API URL being used
console.log('Using API base URL:', API_BASE_URL);

// Auth API URL
export const AUTH_API_URL = `${API_BASE_URL}/api/auth`;

// Customer API URL
export const CUSTOMER_API_URL = `${API_BASE_URL}/api/customer`;

// Order API URL
export const ORDER_API_URL = `${API_BASE_URL}/api/orders`;

// Menu API URL
export const MENU_API_URL = `${API_BASE_URL}/api/menu`;

// Table API URL
export const TABLE_API_URL = `${API_BASE_URL}/api/tables`;

// Other constants
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_PAGINATION_LIMIT = 10; 