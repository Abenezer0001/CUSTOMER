// Theme configuration file for Order Mate Express
// This file contains all theme related settings and color variables

export const themeColors = {
  // Dark theme colors (main theme)
  dark: {
    background: '#0B0C0E',       // Night black background
    card: '#1E1F23',             // Raisin black for cards
    primary: '#464587',          // Marian blue as primary color
    secondary: '#3A3A61',        // Delft blue as secondary color
    accent: '#5C5CA9',           // Lighter marian blue as accent
    text: '#FFFFFF',             // White text
    mutedText: '#A0A0A0',        // Muted text color
    border: '#2A2A30',           // Border color
    success: '#22C55E',          // Success green
    warning: '#F59E0B',          // Warning amber
    error: '#EF4444',            // Error red
  },

  // Light theme colors (optional secondary theme)
  light: {
    background: '#FFFFFF',
    card: '#F8F8F8',
    primary: '#464587',
    secondary: '#5C5CA9',
    accent: '#3A3A61',
    text: '#111111',
    mutedText: '#555555',
    border: '#E2E2E2',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  }
};

// Default image placeholders in case stock images fail
export const imagePlaceholders = {
  food: '/placeholder.svg',
  drink: '/placeholder.svg',
  promotion: '/placeholder.svg',
  category: '/placeholder.svg'
};

// Alternate stock image APIs that can be used (instead of Unsplash)
export const stockImageApis = {
  food: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
  burger: 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg',
  pizza: 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg',
  pasta: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg',
  salad: 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg',
  sushi: 'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg',
  dessert: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg',
  drink: 'https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg',
  cocktail: 'https://images.pexels.com/photos/1170598/pexels-photo-1170598.jpeg',
  wine: 'https://images.pexels.com/photos/3019019/pexels-photo-3019019.jpeg',
  beer: 'https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg',
  coffee: 'https://images.pexels.com/photos/3020919/pexels-photo-3020919.jpeg'
};

// Get a stock image based on category and fallback to default food image
export const getStockImage = (category: string): string => {
  const key = category.toLowerCase() as keyof typeof stockImageApis;
  return stockImageApis[key] || stockImageApis.food;
};

// Theme configuration
export const themeConfig = {
  colors: themeColors,
  defaultTheme: 'dark',
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  }
};

export default themeConfig;
