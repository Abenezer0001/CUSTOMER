
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  featured?: boolean;
  popular?: boolean;
  tags?: string[];
  modifiers?: MenuItemModifierGroup[];
}

export interface MenuItemModifierGroup {
  id: string;
  name: string;
  required?: boolean;
  modifiers: MenuItemModifier[];
}

export interface MenuItemModifier {
  id: string;
  name: string;
  price: number;
}

export interface CookingPreference {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  image?: string;
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
}
