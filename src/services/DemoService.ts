import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.inseat.achievengine.com/api';

// Check if we're in demo mode (URL contains a demo token)
export const isDemoMode = (): boolean => {
  const path = window.location.pathname;
  return path.includes('/demo/') || path.match(/\/[a-f0-9]{12}/) !== null;
};

// Extract demo token from URL if in demo mode
export const getDemoToken = (): string | null => {
  if (!isDemoMode()) return null;
  
  const path = window.location.pathname;
  const match = path.match(/\/([a-f0-9]{12})/);
  return match ? match[1] : null;
};

class DemoService {
  // Get restaurant information for demo
  async getRestaurantInfo() {
    try {
      const demoToken = getDemoToken();
      
      if (!demoToken) {
        return {
          success: false,
          error: 'Not in demo mode'
        };
      }
      
      const response = await axios.get(`${API_URL}/demo/customer/${demoToken}`);
      
      if (response.data.success) {
        // Save restaurant information to localStorage
        localStorage.setItem('demoRestaurantId', response.data.restaurantId);
        localStorage.setItem('demoRestaurantName', response.data.restaurantName);
        localStorage.setItem('isDemo', 'true');
        
        return {
          success: true,
          data: response.data
        };
      }
      
      return {
        success: false,
        error: 'Failed to load demo data'
      };
    } catch (error) {
      console.error('Error loading demo restaurant:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to load demo restaurant data'
      };
    }
  }
  
  // Get the current restaurant ID (for API requests)
  getRestaurantId(): string | null {
    return localStorage.getItem('demoRestaurantId');
  }
  
  // Add demo token to requests
  getAuthHeader() {
    const demoToken = getDemoToken();
    return demoToken ? { 'X-Demo-Token': demoToken } : {};
  }
  
  // Reset demo data
  resetDemo() {
    localStorage.removeItem('demoRestaurantId');
    localStorage.removeItem('demoRestaurantName');
    localStorage.removeItem('isDemo');
  }
}

export default new DemoService(); 