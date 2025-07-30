export interface MenuItem {
  id: string;
  _id?: string; // Added for API compatibility
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  imageSearchTerm?: string; // Added for fallback image generation
  featured?: boolean;
  popular?: boolean;
  tags?: string[];
  modifiers?: MenuItemModifierGroup[];
  modifierGroups?: MenuItemModifierGroup[];
}

// Table and Venue type definitions for tableService
export interface Table {
  _id: string;
  number: string;
  capacity: number;
  status: string;
  isActive: boolean;
  restaurantId: string;
  venueId?: string;
  qrCode?: string;
}

export interface TableDetails extends Table {
  restaurant?: {
    _id: string;
    name: string;
  };
  venue?: {
    _id: string;
    name: string;
    restaurantId: string;
  };
}

export interface Venue {
  _id: string;
  name: string;
  description?: string;
  address: string;
  logo?: string;
  restaurantId: string;
  isActive: boolean;
}

export interface VenueDetails extends Venue {
  openingHours?: Record<string, { open: string; close: string }>;
  phone?: string;
  email?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

// Represents an option within a modifier group (e.g., "Small", "Medium", "Large" for Size)
export interface ModifierOption {
  _id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  isDefault?: boolean;
}

// Represents a group of modifiers for a menu item (e.g., "Size", "Toppings")
export interface MenuItemModifierGroup {
  _id: string;
  name: string;
  description?: string;
  selectionType: 'SINGLE' | 'MULTIPLE'; // Determines how the options are presented
  isRequired?: boolean;
  options: ModifierOption[]; // The available choices for this modifier group
}

// --- Removed old MenuItemModifier interface ---

export interface CookingPreference {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  image?: string;
  subCategories?: string[]; // Add this for compatibility with existing code
  imageSearchTerm?: string; // Add this for image searches
  restaurantId?: string;
}

export interface CartItem {
  id: string;
  menuItemId?: string;  // Make optional as it might be derived from id in some cases
  name: string;
  price: number;
  quantity: number;
  image?: string;  // Make optional as it might not be available from API
  modifiers?: CartItemModifier[];
  cookingPreference?: string;
  specialInstructions?: string;
  // Helper method to calculate the total price including modifiers
  getItemTotal?: () => number;
}

/**
 * Represents a modifier selected for a cart item
 */
export interface CartItemModifier {
  id: string;
  name: string;
  price: number;
}

export interface Order {
  id: string;
  _id?: string; // MongoDB ObjectId format for backend compatibility
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  serviceFee: number;
  tip: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  timestamp: Date;
  createdAt?: string; // ISO string format from backend for filtering
  tableId: string; // Changed from tableNumber to match API
  userId?: string; // User ID for filtering orders by user
  specialInstructions?: string;
}

// Export new enum types to replace the string literal types
export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity' | 'dateAdded'>) => void;
  addItem: (
    item: any,
    quantity: number,
    modifiers?: CartModifier[],
    options?: any,
    specialInstructions?: string
  ) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  cartTotal: number;
}

export type FavoritesContextType = {
  favorites: string[];
  addFavorite: (itemId: string) => void;
  removeFavorite: (itemId: string) => void;
  isFavorite: (itemId: string) => boolean;
};

export interface OrdersContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Order) => void;
  getOrderById: (id: string) => Promise<Order | null>;
  updateOrder?: (id: string, updates: Partial<Order>) => void;
  clearOrders: () => void;
  refreshOrders: () => Promise<void>;
}

export interface TableInfo {
  tableNumber?: string; // Make optional since we'll use tableId
  restaurantName: string;
  tableId: string; // Make required to match API
  restaurantId?: string; // Added for group ordering functionality
}

// Rating and Review Types
export interface Rating {
  _id: string;
  userId: string;
  menuItemId: string;
  restaurantId: string;
  rating: number; // 1-5 stars
  comment?: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  helpfulVotes: string[]; // Array of user IDs who voted helpful
  unhelpfulVotes: string[]; // Array of user IDs who voted unhelpful
  createdAt: string;
  updatedAt: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface RatingFilters {
  rating?: number; // Filter by specific star rating
  sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
  verifiedOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface RatingSubmission {
  menuItemId: string;
  rating: number;
  comment?: string;
}

export interface RatingUpdate {
  rating?: number;
  comment?: string;
}

export interface HelpfulVoteResponse {
  helpful: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
}

export interface PaginatedRatings {
  ratings: Rating[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface RatingAnalytics {
  topRatedItems: Array<{
    menuItemId: string;
    menuItemName: string;
    averageRating: number;
    totalReviews: number;
  }>;
  recentTrends: Array<{
    date: string;
    averageRating: number;
    totalReviews: number;
  }>;
  categoryRatings: Array<{
    category: string;
    averageRating: number;
    totalReviews: number;
  }>;
}

// Re-export all types
export * from './menu';
export * from './Order';
