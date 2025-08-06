export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  imageSearchTerm?: string;
  categoryId: string;
  subCategoryId?: string;
  featured?: boolean;
  tags?: string[];
  preparationTime?: string;
  rating?: number;
  modifiers?: MenuItemModifierGroup[];
  isActive?: boolean;
  availabilityMessage?: string;
}

export interface TableVerification {
  exists: boolean;
  isAvailable: boolean;
  table?: {
    _id: string;
    number: string;
    venueId: string;
  };
  venue?: {
    _id: string;
    name: string;
    description?: string;
  };
}

export interface Category {
  _id: string;
  name: string;
  image?: string;
  isActive?: boolean;
  subCategories?: string[];
}

export interface SubCategory {
  _id: string;
  name: string;
  categoryId?: string;
  subSubCategories?: string[];
}

export interface Menu {
  _id: string;
  name: string;
  description: string;
  restaurantId: string;
  venueId: {
    _id: string;
    name: string;
  };
  categories: Category[];
  subCategories: SubCategory[];
  createdAt: string;
  updatedAt: string;
}

