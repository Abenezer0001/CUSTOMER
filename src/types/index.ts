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
}

// Represents an option within a modifier group (e.g., "Small", "Medium", "Large" for Size)
export interface ModifierOption {
  name: string;
  price: number;
}

// Represents a group of modifiers for a menu item (e.g., "Size", "Toppings")
export interface MenuItemModifierGroup {
  name: string;
  type: 'single-select' | 'multi-select'; // Determines how the options are presented
  required?: boolean;
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
  tableId: string; // Changed from tableNumber to match API
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

export type CartContextType = {
  cartItems: CartItem[];  // Renamed from items to cartItems for consistency with API
  addItem: (item: MenuItem, quantity: number, modifiers?: CartItemModifier[], cookingPreference?: string, specialInstructions?: string) => void;
  removeFromCart: (id: string) => void;  // Renamed from removeItem for clarity
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;  // Renamed from totalItems for clarity
  cartTotal: number;  // Renamed from subtotal to cartTotal for clarity
};

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
}

export interface TableInfo {
  tableNumber?: string; // Make optional since we'll use tableId
  restaurantName: string;
  tableId: string; // Make required to match API
}

// Re-export all types
export * from './menu';
export * from './Order';
