// Configuration interface
interface ApiConfig {
  baseUrl: string;
  authUrl: string;
  socketUrl: string;
  customerUrl: string;
}

// Environment variable validation
const requiredEnvVars = [
  'VITE_API_BASE_URL',
  'VITE_AUTH_API_URL',
  'VITE_SOCKET_URL',
  'VITE_CUSTOMER_URL',
] as const;

// Check for missing environment variables
const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !import.meta.env[envVar]
);

if (missingEnvVars.length > 0) {
  console.warn(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

// Import the base URL from the main constants file
import { API_BASE_URL as ConstantsBaseUrl } from '@/constants';

// Extract domain without /api if present
const baseDomain = typeof ConstantsBaseUrl === 'string' && ConstantsBaseUrl.includes('/api') 
  ? ConstantsBaseUrl.split('/api')[0] 
  : ConstantsBaseUrl;

// API configuration
export const apiConfig: ApiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || `${baseDomain}/api`,
  authUrl: import.meta.env.VITE_AUTH_API_URL || `${baseDomain}/api/auth`,
  socketUrl: import.meta.env.VITE_SOCKET_URL || baseDomain,
  customerUrl: import.meta.env.VITE_CUSTOMER_URL || 'https://menu.inseat.achievengine.com',
};

// Export individual URLs for convenience
export const API_BASE_URL = apiConfig.baseUrl;
export const AUTH_API_URL = apiConfig.authUrl;
export const SOCKET_URL = apiConfig.socketUrl;
export const CUSTOMER_URL = apiConfig.customerUrl;

export default apiConfig;

