// API Base URL
// Get API URL from environment variables, with fallback to localhost
const envApiUrl = import.meta.env.VITE_API_BASE_URL;

// Ensure API_BASE_URL is the true root (e.g., http://localhost:3001)
let processedApiUrl = envApiUrl || 'https://api.inseat.achievengine.com';
if (processedApiUrl.endsWith('/api')) {
  processedApiUrl = processedApiUrl.slice(0, -4); // Remove last /api
} else if (processedApiUrl.endsWith('/api/')) { // also handle trailing slash
  processedApiUrl = processedApiUrl.slice(0, -5); // Remove last /api/
}
export const API_BASE_URL = processedApiUrl;

// Log the API URL being used
console.log('Processed API base URL for constants:', API_BASE_URL);

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