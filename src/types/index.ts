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
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  modifiers?: CartItemModifier[];
  cookingPreference?: string;
  specialInstructions?: string;
}

export interface CartItemModifier {
  id: string;
  name: string;
  price: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  timestamp: Date;
  tableNumber: string;
}

export type OrderStatus = 'preparing' | 'ready' | 'delivered' | 'completed';

export type CartContextType = {
  items: CartItem[];
  addItem: (item: MenuItem, quantity: number, modifiers?: CartItemModifier[], cookingPreference?: string, specialInstructions?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
};

export type FavoritesContextType = {
  favorites: string[];
  addFavorite: (itemId: string) => void;
  removeFavorite: (itemId: string) => void;
  isFavorite: (itemId: string) => boolean;
};

export type OrdersContextType = {
  orders: Order[];
  addOrder: (order: Order) => void;
  getOrderById: (id: string) => Order | undefined;
  clearOrders: () => void;
};

export interface TableInfo {
  tableNumber: string;
  restaurantName: string;
  tableId?: string;
}
