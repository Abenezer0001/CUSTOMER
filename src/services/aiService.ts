// AI Service for communicating with the backend AI endpoints with streaming support
interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  preparationTime: number;
  allergens: string[];
  nutritionalInfo: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fats: number;
  };
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  spiceLevel: string;
  images: string[];
  tags: string[];
  categories?: string[];
  image?: string;
}

interface ChatResponse {
  message: string;
  items: MenuItem[];
  suggestions: string[];
  menuSuggestions?: MenuItem[];
  intent: string;
  timestamp: string;
}

interface StreamingChunk {
  type: 'start' | 'thinking' | 'text' | 'items' | 'suggestions' | 'complete' | 'error' | 'end';
  content?: string;
  message?: string;
  items?: MenuItem[];
  suggestions?: string[];
  timestamp: string;
}

interface AIHealthResponse {
  status: string;
  service: string;
  vectorStats: {
    isInitialized: boolean;
    totalItems: number;
    totalDocuments: number;
  };
  timestamp: string;
}

class AIService {
  private baseUrl: string;

  constructor() {
    // Use environment variable for API URL with fallback to localhost during development
    const envApiUrl = import.meta.env.VITE_API_BASE_URL;
    let processedApiUrl = envApiUrl || 'http://localhost:3001';
    
    // Ensure we have the base URL without /api suffix
    if (processedApiUrl.endsWith('/api')) {
      processedApiUrl = processedApiUrl.slice(0, -4);
    } else if (processedApiUrl.endsWith('/api/')) {
      processedApiUrl = processedApiUrl.slice(0, -5);
    }
    
    this.baseUrl = processedApiUrl;
    console.log('AI Service using base URL:', this.baseUrl);
  }

  /**
   * Get authentication token from various sources
   */
  private getAuthToken(): string | null {
    // Try localStorage first
    const localToken = localStorage.getItem('auth_token');
    if (localToken) {
      return localToken;
    }
    
    // Then try cookies
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => 
      cookie.trim().startsWith('auth_token=') || 
      cookie.trim().startsWith('access_token=')
    );
    
    if (tokenCookie) {
      return tokenCookie.split('=')[1].trim();
    }
    
    return null;
  }

  /**
   * Send a chat message to the AI service with streaming support
   */
  async* streamMessage(message: string, sessionId: string = 'default'): AsyncGenerator<StreamingChunk> {
    try {
      const token = this.getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/api/ai/chat/stream`, {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ message, sessionId }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'end') {
                  return;
                }
                yield data as StreamingChunk;
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Streaming error:', error);
      yield {
        type: 'error',
        message: 'Failed to connect to AI service. Please try again.',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send a chat message to the AI service (non-streaming fallback)
   */
  async sendMessage(message: string): Promise<ChatResponse> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check AI service health and status
   */
  async getHealth(): Promise<AIHealthResponse> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/ai/health`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`AI service health check failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Format price for display
   */
  static formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  /**
   * Get dietary restrictions display text
   */
  static getDietaryInfo(item: MenuItem): string[] {
    const info: string[] = [];
    if (item.isVegetarian) info.push('Vegetarian');
    if (item.isVegan) info.push('Vegan');
    if (item.isGlutenFree) info.push('Gluten-Free');
    return info;
  }

  /**
   * Get spice level emoji
   */
  static getSpiceLevelEmoji(spiceLevel: string): string {
    switch (spiceLevel?.toLowerCase()) {
      case 'mild': return '🌶️';
      case 'medium': return '🌶️🌶️';
      case 'hot': return '🌶️🌶️🌶️';
      case 'very hot': return '🌶️🌶️🌶️🌶️';
      default: return '';
    }
  }

  /**
   * Test if streaming is supported
   */
  async testStreaming(): Promise<boolean> {
    try {
      const testStream = this.streamMessage('Hello');
      const firstChunk = await testStream.next();
      return !firstChunk.done;
    } catch (error) {
      console.warn('Streaming test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const aiService = new AIService();
export default aiService;
export { AIService };
export type { ChatResponse, MenuItem, AIHealthResponse, StreamingChunk }; 