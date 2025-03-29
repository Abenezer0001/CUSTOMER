
import { toast } from 'sonner';

interface FetchWithFallbackOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  method?: string;
  body?: BodyInit;
  fallbackPath: string;
  timeout?: number;
}

interface FetchWithFallbackResult<T> {
  data: T;
  isFallback: boolean;
}

/**
 * Fetch data from an API endpoint with fallback to a local JSON file
 */
export const fetchWithFallback = async <T>(
  apiUrl: string,
  options: FetchWithFallbackOptions
): Promise<FetchWithFallbackResult<T>> => {
  let isFallback = false;
  
  // Add timeout if not provided
  const timeoutSignal = options.timeout 
    ? AbortSignal.timeout(options.timeout) 
    : AbortSignal.timeout(5000); // 5 seconds default
  
  const fetchSignal = options.signal 
    ? AbortSignal.any([options.signal, timeoutSignal]) 
    : timeoutSignal;
  
  try {
    // Try API endpoint first
    const apiResponse = await fetch(apiUrl, {
      method: options.method || 'GET',
      headers: options.headers || {
        'Content-Type': 'application/json',
      },
      body: options.body,
      signal: fetchSignal,
    });

    if (apiResponse.ok) {
      const data = await apiResponse.json();
      return { data, isFallback: false };
    }
    
    throw new Error(`API request failed with status: ${apiResponse.status}`);
  } catch (error) {
    console.error(`Error fetching ${apiUrl}:`, error);
    
    // API request failed, fall back to local JSON
    isFallback = true;
    try {
      console.info(`Falling back to local file: ${options.fallbackPath}`);
      const fallbackResponse = await fetch(options.fallbackPath);
      
      if (!fallbackResponse.ok) {
        throw new Error(`Fallback request failed with status: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      return { data: fallbackData, isFallback: true };
    } catch (fallbackError) {
      console.error(`Fallback to ${options.fallbackPath} failed:`, fallbackError);
      throw new Error(`Both API and fallback data sources failed`);
    }
  }
};

/**
 * Add data to a JSON file if API is not available
 */
export const saveDataLocally = async <T>(
  apiUrl: string, 
  data: T, 
  fallbackPath: string
): Promise<boolean> => {
  try {
    // Try API endpoint first
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    });

    if (apiResponse.ok) {
      toast.success('Data saved successfully');
      return true;
    }
    
    throw new Error(`API request failed with status: ${apiResponse.status}`);
  } catch (error) {
    console.error(`Error saving to ${apiUrl}:`, error);
    
    // In a real app, we would save to localStorage as we can't write to files directly
    // from browser. For this demo, we'll just show what would happen.
    const localStorageKey = `local_${fallbackPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    try {
      // Get existing data if any
      let existingData = [];
      const storedData = localStorage.getItem(localStorageKey);
      
      if (storedData) {
        existingData = JSON.parse(storedData);
      }
      
      // Add new data
      if (Array.isArray(existingData)) {
        existingData.push(data);
      } else {
        existingData = [data];
      }
      
      // Save back to localStorage
      localStorage.setItem(localStorageKey, JSON.stringify(existingData));
      
      toast.warning('API is unavailable. Data saved locally and will be synced when the server is back online.');
      return true;
    } catch (localSaveError) {
      console.error('Failed to save data locally:', localSaveError);
      toast.error('Failed to save data. Please try again later.');
      return false;
    }
  }
};
