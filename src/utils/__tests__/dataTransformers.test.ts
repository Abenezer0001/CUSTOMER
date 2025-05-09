import {
  transformRestaurant,
  transformVenue,
  transformCategory,
  transformSubcategory,
  transformMenuItem,
  transformTableMenu,
  transformMenuHierarchy,
  validateRequiredFields,
  UiRestaurant,
  UiVenue,
  UiCategory,
  UiSubcategory
} from '../dataTransformers';
import { ApiError } from '../../api/menuService';
import { MenuItem as UiMenuItem } from '../../types/menu';

describe('Data Transformers', () => {
  describe('transformRestaurant', () => {
    it('should transform API restaurant format to UI format', () => {
      const apiRestaurant = {
        _id: "68187734a6d5090de7422456",
        name: "CINEMA CITY ARABIAN CENTRE",
        venues: [],
        tables: [],
        adminIds: [],
        locations: [],
        menu: [],
        schedule: [],
        createdAt: "2025-05-05T08:30:44.441Z",
        updatedAt: "2025-05-05T08:30:44.441Z",
        __v: 0
      };

      const expected: UiRestaurant = {
        id: "68187734a6d5090de7422456",
        name: "CINEMA CITY ARABIAN CENTRE",
        venues: []
      };

      expect(transformRestaurant(apiRestaurant)).toEqual(expected);
    });

    it('should transform restaurant with venues', () => {
      const apiRestaurant = {
        _id: "68187734a6d5090de7422456",
        name: "CINEMA CITY ARABIAN CENTRE",
        venues: [
          {
            _id: "venue1",
            name: "Main Hall",
            description: "Main dining area",
            restaurantId: {
              _id: "68187734a6d5090de7422456",
              name: "CINEMA CITY ARABIAN CENTRE"
            }
          }
        ],
        createdAt: "2025-05-05T08:30:44.441Z",
        updatedAt: "2025-05-05T08:30:44.441Z"
      };

      const result = transformRestaurant(apiRestaurant);
      expect(result.id).toBe("68187734a6d5090de7422456");
      expect(result.name).toBe("CINEMA CITY ARABIAN CENTRE");
      expect(result.venues).toHaveLength(1);
      expect(result.venues?.[0].id).toBe("venue1");
      expect(result.venues?.[0].name).toBe("Main Hall");
    });

    it('should throw error for invalid restaurant data', () => {
      const invalidData = {
        name: "Test Restaurant"
        // Missing _id
      };

      expect(() => transformRestaurant(invalidData)).toThrow(ApiError);
    });
  });

  describe('transformVenue', () => {
    it('should transform API venue format to UI format', () => {
      const apiVenue = {
        _id: "venue1",
        name: "Main Hall",
        description: "Main dining area",
        restaurantId: {
          _id: "rest1",
          name: "CINEMA CITY"
        }
      };

      const expected: UiVenue = {
        id: "venue1",
        name: "Main Hall",
        description: "Main dining area",
        restaurantId: "rest1",
        restaurantName: "CINEMA CITY"
      };

      expect(transformVenue(apiVenue)).toEqual(expected);
    });

    it('should handle missing optional fields', () => {
      const apiVenue = {
        _id: "venue1",
        name: "Main Hall",
        restaurantId: {
          _id: "rest1"
        }
      };

      const result = transformVenue(apiVenue);
      expect(result.description).toBe('');
      expect(result.restaurantId).toBe('rest1');
      expect(result.restaurantName).toBeUndefined();
    });

    it('should throw error for invalid venue data', () => {
      const invalidData = {
        description: "Main dining area"
        // Missing _id and name
      };

      expect(() => transformVenue(invalidData as any)).toThrow(ApiError);
    });
  });

  describe('transformCategory', () => {
    it('should transform API category format to UI format', () => {
      const apiCategory = {
        _id: "cat1",
        name: "Burgers",
        description: "Delicious burgers",
        image: "burger.jpg",
        isActive: true,
        order: 1,
        restaurantId: "rest1"
      };

      const expected: UiCategory = {
        id: "cat1",
        name: "Burgers",
        description: "Delicious burgers",
        image: "burger.jpg",
        restaurantId: "rest1",
        order: 1
      };

      expect(transformCategory(apiCategory)).toEqual(expected);
    });

    it('should handle missing optional fields', () => {
      const apiCategory = {
        _id: "cat1",
        name: "Burgers"
      };

      const result = transformCategory(apiCategory);
      expect(result.id).toBe("cat1");
      expect(result.name).toBe("Burgers");
      expect(result.image).toBe('');
      expect(result.description).toBeUndefined();
      expect(result.order).toBeUndefined();
    });

    it('should throw error for invalid category data', () => {
      const invalidData = {
        _id: "cat1"
        // Missing name
      };

      expect(() => transformCategory(invalidData as any)).toThrow(ApiError);
    });
  });

  describe('transformSubcategory', () => {
    it('should transform API subcategory format to UI format', () => {
      const apiSubcategory = {
        _id: "subcat1",
        name: "Beef Burgers",
        description: "All beef burgers",
        image: "beef.jpg",
        isActive: true,
        order: 1,
        categoryId: "cat1"
      };

      const expected: UiSubcategory = {
        id: "subcat1",
        name: "Beef Burgers",
        description: "All beef burgers",
        image: "beef.jpg",
        categoryId: "cat1",
        order: 1
      };

      expect(transformSubcategory(apiSubcategory)).toEqual(expected);
    });

    it('should handle missing optional fields', () => {
      const apiSubcategory = {
        _id: "subcat1",
        name: "Beef Burgers",
        categoryId: "cat1"
      };

      const result = transformSubcategory(apiSubcategory);
      expect(result.id).toBe("subcat1");
      expect(result.name).toBe("Beef Burgers");
      expect(result.categoryId).toBe("cat1");
      expect(result.image).toBe('');
      expect(result.description).toBeUndefined();
    });

    it('should throw error for invalid subcategory data', () => {
      const invalidData = {
        _id: "subcat1",
        // Missing name
        categoryId: "cat1"
      };

      expect(() => transformSubcategory(invalidData as any)).toThrow(ApiError);
    });
  });

  describe('transformMenuItem', () => {
    it('should transform API menu item format to UI format', () => {
      const apiMenuItem = {
        _id: "item1",
        name: "Classic Burger",
        description: "Juicy beef patty",
        price: 15.99,
        image: "burger.jpg",
        categories: ["cat1"],
        subCategories: ["subcat1"],
        isAvailable: true,
        isActive: true
      };

      const result = transformMenuItem(apiMenuItem);
      
      // Check that result conforms to the UI MenuItem interface
      const expectedMenuItem: UiMenuItem = {
        id: "item1",
        name: "Classic Burger",
        description: "Juicy beef patty",
        price: 15.99,
        image: "burger.jpg",
        imageSearchTerm: "",
        category: "cat1",
        categoryId: "cat1",
        subcategory: "subcat1",
        featured: false,
        popular: false,
        tags: []
      };
      
      expect(result).toEqual(expectedMenuItem);
    });

    it('should handle menu items without categories', () => {
      const apiMenuItem = {
        _id: "item1",
        name: "Classic Burger",
        description: "Juicy beef patty",
        price: 15.99,
        image: "burger.jpg",
        categories: [],
        isAvailable: true,
        isActive: true
      };

      const result = transformMenuItem(apiMenuItem);
      expect(result.category).toBe('');
      expect(result.categoryId).toBe('');
      expect(result.subcategory).toBeUndefined();
    });

    it('should handle menu items with missing fields', () => {
      const apiMenuItem = {
        _id: "item1",
        name: "Classic Burger",
        price: 15.99,
        categories: ["cat1"],
        isAvailable: true,
        isActive: true
      };

      const result = transformMenuItem(apiMenuItem);
      expect(result.description).toBe('');
      expect(result.image).toBe('');
    });

    it('should throw error for invalid menu item data', () => {
      const invalidData = {
        _id: "item1",
        // Missing name
        price: 15.99
      };

      expect(() => transformMenuItem(invalidData as any)).toThrow(ApiError);
    });
  });

  describe('transformTableMenu', () => {
    it('should transform complete table menu data', () => {
      const apiTableMenu = {
        venue: {
          _id: 'venue1',
          name: 'Test Venue',
          description: 'Test description'
        },
        menu: {
          categories: [{
            _id: 'cat1',
            name: 'Burgers',
            image: 'burger.jpg',
            description: 'Burgers category',
            isActive: true,
            order: 1,
            restaurantId: 'rest1'
          }],
          subcategories: {},
          menuItems: [{
            _id: 'item1',
            name: 'Classic Burger',
            description: 'Delicious burger',
            price: 9.99,
            image: 'burger.jpg',
            categories: ['cat1'],
            isAvailable: true,
            isActive: true
          }]
        }
      };

      const result = transformTableMenu(apiTableMenu);
      
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('menuItems');
      expect(result.categories).toHaveLength(1);
      expect(result.menuItems).toHaveLength(1);
      
      // Check transformed category
      expect(result.categories[0].id).toBe('cat1');
      expect(result.categories[0].name).toBe('Burgers');
      
      // Check transformed menu item
      expect(result.menuItems[0].id).toBe('item1');
      expect(result.menuItems[0].name).toBe('Classic Burger');
      expect(result.menuItems[0].categoryId).toBe('cat1');
    });

    it('should throw error for invalid table menu data', () => {
      // Missing categories
      const invalidTableMenu = {
        venue: {
          _id: 'venue1',
          name: 'Test Venue'
        },
        menu: {
          menuItems: []
        }
      };

      expect(() => transformTableMenu(invalidTableMenu as any)).toThrow(ApiError);
    });
  });

  describe('transformMenuHierarchy', () => {
    it('should transform complete menu hierarchy', () => {
      const apiData = {
        categories: [{
          _id: "cat1",
          name: "Burgers",
          image: "burger.jpg",
          isActive: true,
          order: 1
        }],
        subcategories: {
          "cat1": [{
            _id: "subcat1",
            name: "Beef Burgers",
            image: "beef.jpg",
            categoryId: "cat1",
            isActive: true,
            order: 1
          }]
        },
        subsubcategories: {},
        menuItems: [{
          _id: "item1",
          name: "Classic Burger",
          description: "Juicy beef patty",
          price: 15.99,
          image: "burger.jpg",
          categories: ["cat1"],
          subCategories: ["subcat1"],
          isAvailable: true,
          isActive: true
        }]
      };

      const result = transformMenuHierarchy(apiData);
      
      // Check categories
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].id).toBe("cat1");
      expect(result.categories[0].name).toBe("Burgers");
      
      // Check subcategories
      expect(result.subcategories["cat1"]).toHaveLength(1);
      expect(result.subcategories["cat1"][0].id).toBe("subcat1");
      expect(result.subcategories["cat1"][0].name).toBe("Beef Burgers");
      
      // Check menu items
      expect(result.menuItems).toHaveLength(1);
      expect(result.menuItems[0].id).toBe("item1");
      expect(result.menuItems[0].name).toBe("Classic Burger");
      expect(result.menuItems[0].category).toBe("cat1");
    });

    it('should handle empty subcategories', () => {
      const apiData = {
        categories: [{
          _id: "cat1",
          name: "Burgers",
          image: "burger.jpg",
          isActive: true
        }],
        subcategories: {},
        subsubcategories: {},
        menuItems: [{
          _id: "item1",
          name: "Classic Burger",
          price: 15.99,
          categories: ["cat1"],
          isAvailable: true,
          isActive: true
        }]
      };

      const result = transformMenuHierarchy(apiData);
      expect(result.categories).toHaveLength(1);
      expect(Object.keys(result.subcategories)).toHaveLength(0);
      expect(result.menuItems).toHaveLength(1);
    });
  });

  describe('validateRequiredFields', () => {
    it('should validate required fields successfully', () => {
      const data = {
        field1: 'value1',
        field2: 'value2',
        field3: null
      };

      expect(() => validateRequiredFields(data, ['field1', 'field2'])).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      const data = {
        field1: 'value1',
        field2: undefined
      };

      expect(() => validateRequiredFields(data, ['field1', 'field2']))
        .toThrow('Missing required field: field2');
    });

    it('should throw error for null values', () => {
      const data

