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

// API configuration
export const apiConfig: ApiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  authUrl: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001/api/auth',
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001',
  customerUrl: import.meta.env.VITE_CUSTOMER_URL || 'http://localhost:8080',
};

// Export individual URLs for convenience
export const API_BASE_URL = apiConfig.baseUrl;
export const AUTH_API_URL = apiConfig.authUrl;
export const SOCKET_URL = apiConfig.socketUrl;
export const CUSTOMER_URL = apiConfig.customerUrl;

export default apiConfig;

