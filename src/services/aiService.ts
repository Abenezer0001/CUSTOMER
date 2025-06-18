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
  textToSpeech?: {
    configured: boolean;
    voiceId: string;
  };
  timestamp: string;
}

interface TTSConfig {
  configured: boolean;
  voiceId: string;
  modelId: string;
}

interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

interface Voice {
  voice_id: string;
  name: string;
  description?: string;
  category?: string;
}

// ElevenLabs configuration from environment variables
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || 'sk_1aff2da803c0fc7cb47d27a955e06a93244fbbb2600ad7b2';
const DEFAULT_VOICE_ID = "scOwDtmlUjD3prqpp97I"; // Rachel voice

console.log('🔊 ElevenLabs Configuration:');
console.log('  - API Key Source:', import.meta.env.VITE_ELEVENLABS_API_KEY ? 'Environment Variable' : 'Fallback/Hardcoded');
console.log('  - API Key Available:', ELEVENLABS_API_KEY ? `Yes (${ELEVENLABS_API_KEY.slice(0, 10)}...)` : 'No');
console.log('  - Voice ID:', DEFAULT_VOICE_ID);

class AIService {
  private baseUrl: string;
  private currentAudio: HTMLAudioElement | null = null;
  private ttsConfig: TTSConfig | null = null;

  constructor() {
    // Use environment variable for API URL with fallback to localhost during development
    const envApiUrl = import.meta.env.VITE_API_BASE_URL;
    let processedApiUrl = envApiUrl;
    
    // Ensure we have the base URL without /api suffix
    if (processedApiUrl.endsWith('/api')) {
      processedApiUrl = processedApiUrl.slice(0, -4);
    } else if (processedApiUrl.endsWith('/api/')) {
      processedApiUrl = processedApiUrl.slice(0, -5);
    }
    
    this.baseUrl = processedApiUrl;
    console.log('AI Service using base URL:', this.baseUrl);
    
    // Initialize TTS configuration
    this.initializeTTS();
  }

  /**
   * Initialize text-to-speech configuration
   */
  private async initializeTTS(): Promise<void> {
    try {
      this.ttsConfig = {
        configured: !!ELEVENLABS_API_KEY,
        voiceId: DEFAULT_VOICE_ID,
        modelId: 'eleven_turbo_v2'
      };
      console.log('🔊 TTS initialized with ElevenLabs direct API:', this.ttsConfig.configured ? 'Available' : 'Not configured');
    } catch (error) {
      console.warn('Failed to initialize TTS:', error);
    }
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
   * Convert text to speech and get audio URL
   */
  async convertTextToSpeech(
    text: string, 
    voiceId?: string, 
    voiceSettings?: VoiceSettings
  ): Promise<string> {
    if (!this.ttsConfig?.configured) {
      throw new Error('Text-to-speech is not configured');
    }

    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/ai/chat/tts`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ 
        text, 
        voiceId, 
        voiceSettings: voiceSettings || {
          stability: 0.5,
          similarity_boost: 0.7
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `TTS service error: ${response.status}`);
    }

    // Create a blob URL from the audio response
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  }

  /**
   * Play text as speech using ElevenLabs API directly or browser fallback
   */
  async playTextAsSpeech(text: string, voiceId?: string): Promise<void> {
    console.log('🔊 TTS: Starting playTextAsSpeech with text:', text.substring(0, 50) + '...');
    
    if (!text || !text.trim()) {
      console.warn('🔊 TTS: Empty text provided');
      return;
    }

    const cleanText = this.cleanTextForSpeech(text);
    
    // Default to browser TTS if ElevenLabs fails
    const useBrowserTTS = () => {
      console.log('🗣️ TTS: Using browser speech synthesis fallback...');
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        // Handle voice selection
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
          const preferredVoice = voices.find(voice => 
            voice.lang.startsWith('en-') && 
            (voice.name.includes('Natural') || voice.name.includes('Enhanced') || voice.default)
          ) || voices.find(voice => voice.lang.startsWith('en-')) || voices[0];
          
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
        }
        
        utterance.onend = () => {
          console.log('🗣️ Browser TTS: Speech completed');
        };
        
        utterance.onerror = (event) => {
          console.error('🗣️ Browser TTS: Speech error:', event.error);
        };
        
        // Cancel any existing speech first
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      } else {
        console.warn('🗣️ Browser TTS: Speech synthesis not supported');
      }
    };

    // Try ElevenLabs first if API key is available
    if (ELEVENLABS_API_KEY) {
      try {
        console.log('🔊 TTS: Attempting ElevenLabs TTS...');
        const voice_id = voiceId || DEFAULT_VOICE_ID;
        
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: 'eleven_turbo_v2',
            voice_settings: {
              stability: 0.7,
              similarity_boost: 0.8,
              style: 0.5,
              use_speaker_boost: true
            },
            output_format: "mp3_44100_128"
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`🔊 TTS: ElevenLabs API error (${response.status}):`, errorText);
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        console.log('🔊 TTS: ElevenLabs response successful, creating audio...');
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Stop any currently playing audio
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
        }
        
        this.currentAudio = new Audio(audioUrl);
        
        return new Promise((resolve, reject) => {
          if (!this.currentAudio) return reject(new Error('Audio creation failed'));
          
          this.currentAudio.onended = () => {
            console.log('🔊 TTS: ElevenLabs audio playback completed');
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          
          this.currentAudio.onerror = (error) => {
            console.error('🔊 TTS: ElevenLabs audio playback error:', error);
            URL.revokeObjectURL(audioUrl);
            // Fall back to browser TTS on audio error
            useBrowserTTS();
            resolve(); // Don't reject, just fall back
          };
          
          this.currentAudio.onloadedmetadata = () => {
            this.currentAudio?.play().catch(error => {
              console.error('🔊 TTS: Error starting ElevenLabs playback:', error);
              URL.revokeObjectURL(audioUrl);
              // Fall back to browser TTS
              useBrowserTTS();
              resolve(); // Don't reject, just fall back
            });
          };
          
          this.currentAudio.load();
        });
        
      } catch (elevenlabsError) {
        console.error('🔊 TTS: ElevenLabs error:', elevenlabsError);
        // Fall back to browser TTS
        useBrowserTTS();
      }
    } else {
      console.log('🔊 TTS: No ElevenLabs API key, using browser TTS...');
      useBrowserTTS();
    }
  }

  /**
   * Stop any ongoing speech
   */
  stopSpeech(): void {
    console.log('🔊 TTS: Stopping all speech...');
    
    // Stop ElevenLabs audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    
    // Stop browser speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  /**
   * Clean text for speech synthesis
   */
  private cleanTextForSpeech(text: string): string {
    return text
      .replace(/Finding perfect matches\.\.\.*/gi, '') // Remove "Finding perfect matches..." text
      .replace(/Hi there!?\s*/gi, '') // Remove "Hi there!" greeting if needed
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1')     // Remove italic
      .replace(/`(.*?)`/g, '$1')       // Remove code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/#{1,6}\s/g, '')        // Remove headers
      .replace(/\n+/g, '. ')           // Replace newlines with periods
      .replace(/\s+/g, ' ')            // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '')    // Remove special characters
      .trim();
  }

  /**
   * Check if TTS is available (either ElevenLabs or browser)
   */
  isTTSAvailable(): boolean {
    // Always return true since we have browser fallback
    return true;
  }

  /**
   * Get text-to-speech configuration
   */
  async getTTSConfig(): Promise<TTSConfig> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/ai/chat/tts-config`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get TTS config: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<Voice[]> {
    if (!this.ttsConfig?.configured) {
      throw new Error('Text-to-speech is not configured');
    }

    const token = this.getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/ai/chat/voices`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices || [];
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

    const response = await fetch(`${this.baseUrl}/api/ai/chat/health`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
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