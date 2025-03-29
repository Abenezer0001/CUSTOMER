
/**
 * Utility for fetching data with JSON fallback functionality
 */

type FetchOptions = {
  fallbackPath: string;
  timeoutMs?: number;
  mapDataFn?: (data: any) => any;
};

/**
 * Fetches data with JSON fallback functionality
 * @param apiUrl The API URL to fetch from
 * @param options Options for the fetch including fallback path and timeout
 * @returns The fetched data and a flag indicating if fallback was used
 */
export async function fetchWithFallback<T>(
  apiUrl: string, 
  options: FetchOptions
): Promise<{ data: T, isFallback: boolean }> {
  const { fallbackPath, timeoutMs = 5000, mapDataFn } = options;
  
  // Create an abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    // Try the API first
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return { 
      data: mapDataFn ? mapDataFn(data) : data, 
      isFallback: false 
    };
  } catch (error) {
    console.warn(`API fetch failed for ${apiUrl}, using JSON fallback`, error);
    
    try {
      // Clear timeout if it wasn't triggered by the abort controller
      clearTimeout(timeoutId);
      
      // Fallback to local JSON file
      const fallbackResponse = await fetch(fallbackPath);
      if (!fallbackResponse.ok) {
        throw new Error(`Fallback JSON fetch failed with status ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      return { 
        data: mapDataFn ? mapDataFn(fallbackData) : fallbackData, 
        isFallback: true 
      };
    } catch (fallbackError) {
      console.error('Both API and fallback JSON fetch failed', fallbackError);
      throw new Error('Failed to fetch data from both API and fallback source');
    }
  }
}

/**
 * Creates folders in the data directory if they don't exist
 * Note: This is a simulated function as browser JS cannot create folders
 * In a real app, this would be done by the server
 */
export function ensureDataFolders(): void {
  console.log('Simulating folder creation for data storage');
  // In a browser environment, we can't directly create folders
  // This would need to be handled by the backend
}

/**
 * Saves data to a JSON file
 * Note: This is a simulated function as browser JS cannot write to files
 * In a real app, this would be done by the server
 */
export function saveToJsonFile(path: string, data: any): void {
  console.log(`Simulating saving data to ${path}`, data);
  // In a browser environment, we can't directly write to files
  // This would need to be handled by the backend
  
  // Instead, we can store in localStorage as a fallback
  localStorage.setItem(`simulated_${path.replace(/\//g, '_')}`, JSON.stringify(data));
}
