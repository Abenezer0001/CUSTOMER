import axios from 'axios';
import {
  getTableMenu,
  getCategories,
  getSubcategories,
  getMenuItems,
  getVenueById,
  getVenueMenuItems,
  getFullMenuHierarchy,
  ApiError,
  VenueNotFoundError,
  TableNotFoundError
} from '../menuService';
import { transformMenuItem, transformCategory, transformRestaurant } from '../../utils/dataTransformers';
import { MenuItem as UiMenuItem } from '../../types/menu';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Menu Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTableMenu', () => {
    it('should fetch and transform table menu data correctly', async () => {
      // Mock API response with realistic data structure
      const mockApiResponse = {
        data: {
          venue: {
            _id: 'venue1',
            name: 'CINEMA CITY ARABIAN CENTRE MAIN',
            description: 'Main dining venue'
          },
          menu: {
            categories: [{
              _id: 'cat1',
              name: 'Appetizers',
              description: 'Starter dishes',
              image: 'appetizers.jpg',
              isActive: true,
              order: 1,
              restaurantId: 'rest1'
            }],
            subcategories: {
              'cat1': [{
                _id: 'subcat1',
                name: 'Salads',
                description: 'Fresh salads',
                image: 'salads.jpg',
                isActive: true,
                order: 1,
                categoryId: 'cat1'
              }]
            },
            menuItems: [{
              _id: 'item1',
              name: 'Caesar Salad',
              description: 'Fresh romaine lettuce with Caesar dressing',
              price: 12.99,
              image: 'caesar.jpg',
              categories: ['cat1'],
              subCategories: ['subcat1'],
              isAvailable: true,
              isActive: true
            }]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await getTableMenu('table1');

      // Check the transformed category
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0]).toEqual({
        id: 'cat1',
        name: 'Appetizers',
        description: 'Starter dishes',
        image: 'appetizers.jpg',
        restaurantId: 'rest1',
        order: 1
      });

      // Check the transformed menu item
      expect(result.menuItems).toHaveLength(1);
      expect(result.menuItems[0]).toEqual({
        id: 'item1',
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with Caesar dressing',
        price: 12.99,
        image: 'caesar.jpg',
        imageSearchTerm: '',
        category: 'cat1',
        categoryId: 'cat1',
        subcategory: 'subcat1',
        featured: false,
        popular: false,
        tags: []
      });

      // Verify correct URL was called
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/tables/table1/menu')
      );
    });

    it('should handle table not found error', async () => {
      // Mock API error response
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: 'Table not found' }
        }
      });

      // Expect the service to throw the appropriate error
      await expect(getTableMenu('invalid-table'))
        .rejects
        .toThrow(TableNotFoundError);
    });

    it('should handle server error', async () => {
      // Mock server error
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      });

      // Expect the service to throw ApiError with correct status
      await expect(getTableMenu('table1'))
        .rejects
        .toThrow(ApiError);
    });

    it('should handle network error', async () => {
      // Mock network error
      mockedAxios.get.mockRejectedValueOnce({
        request: {},
        message: 'Network Error'
      });

      // Expect service to throw ApiError with no response message
      await expect(getTableMenu('table1'))
        .rejects
        .toThrow('No response received from server');
    });
  });

  describe('getCategories', () => {
    it('should fetch and transform categories correctly', async () => {
      // Mock API response
      const mockApiResponse = {
        data: [
          {
            _id: 'cat1',
            name: 'Appetizers',
            description: 'Starter dishes',
            image: 'appetizers.jpg',
            isActive: true,
            order: 1,
            restaurantId: 'rest1'
          },
          {
            _id: 'cat2',
            name: 'Main Courses',
            description: 'Main dishes',
            image: 'mains.jpg',
            isActive: true,
            order: 2,
            restaurantId: 'rest1'
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await getCategories();

      // Verify correct transformation and structure
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'cat1',
        name: 'Appetizers',
        description: 'Starter dishes',
        image: 'appetizers.jpg',
        restaurantId: 'rest1',
        order: 1
      });
      expect(result[1]).toEqual({
        id: 'cat2',
        name: 'Main Courses',
        description: 'Main dishes',
        image: 'mains.jpg',
        restaurantId: 'rest1',
        order: 2
      });

      // Verify correct URL was called
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/categories')
      );
    });

    it('should handle empty categories response', async () => {
      // Mock empty response
      mockedAxios.get.mockResolvedValueOnce({ data: [] });

      const result = await getCategories();
      
      // Should return empty array
      expect(result).toEqual([]);
    });

    it('should handle API error', async () => {
      // Mock API error
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'Server error' }
        }
      });

      // Expect appropriate error to be thrown
      await expect(getCategories())
        .rejects
        .toThrow(ApiError);
    });
  });

  describe('getSubcategories', () => {
    it('should fetch and transform subcategories correctly', async () => {
      // Mock API response
      const mockApiResponse = {
        data: [
          {
            _id: 'subcat1',
            name: 'Salads',
            description: 'Fresh salads',
            image: 'salads.jpg',
            isActive: true,
            order: 1,
            categoryId: 'cat1'
          },
          {
            _id: 'subcat2',
            name: 'Soups',
            description: 'Hot soups',
            image: 'soups.jpg',
            isActive: true,
            order: 2,
            categoryId: 'cat1'
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await getSubcategories('cat1');

      // Verify correct transformation and structure
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'subcat1',
        name: 'Salads',
        description: 'Fresh salads',
        image: 'salads.jpg',
        categoryId: 'cat1',
        order: 1
      });

      // Verify correct URL was called
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/categories/cat1/subcategories')
      );
    });
  });

  describe('getMenuItems', () => {
    it('should fetch and transform menu items by category', async () => {
      // Mock API response
      const mockApiResponse = {
        data: [
          {
            _id: 'item1',
            name: 'Caesar Salad',
            description: 'Fresh romaine lettuce with Caesar dressing',
            price: 12.99,
            image: 'caesar.jpg',
            categories: ['cat1'],
            subCategories: ['subcat1'],
            isAvailable: true,
            isActive: true
          },
          {
            _id: 'item2',
            name: 'Greek Salad',
            description: 'Mediterranean salad with feta cheese',
            price: 11.99,
            image: 'greek.jpg',
            categories: ['cat1'],
            subCategories: ['subcat1'],
            isAvailable: true,
            isActive: true
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await getMenuItems('cat1');

      // Verify the returned items match the UI MenuItem interface
      expect(result).toHaveLength(2);
      
      // First item
      expect(result[0]).toEqual({
        id: 'item1',
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with Caesar dressing',
        price: 12.99,
        image: 'caesar.jpg',
        imageSearchTerm: '',
        category: 'cat1',
        categoryId: 'cat1',
        subcategory: 'subcat1',
        featured: false,
        popular: false,
        tags: []
      });

      // Verify the result is compatible with UiMenuItem interface
      const uiMenuItem: UiMenuItem = result[0];
      expect(uiMenuItem.id).toBe('item1');
      expect(uiMenuItem.name).toBe('Caesar Salad');

      // Verify correct URL with parameters
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/menu-items?categoryId=cat1')
      );
    });

    it('should handle subcategory filtering correctly', async () => {
      // Mock API response with subcategory filtering
      mockedAxios.get.mockResolvedValueOnce({ 
        data: [
          {
            _id: 'item1',
            name: 'Caesar Salad',
            description: 'Fresh romaine lettuce with Caesar dressing',
            price: 12.99,
            image: 'caesar.jpg',
            categories: ['cat1'],
            subCategories: ['subcat1'],
            isAvailable: true,
            isActive: true
          }
        ] 
      });

      await getMenuItems('cat1', 'subcat1');

      // Verify correct URL with both parameters
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/menu-items?categoryId=cat1&subcategoryId=subcat1')
      );
    });

    it('should handle empty menu items response', async () => {
      // Mock empty response
      mockedAxios.get.mockResolvedValueOnce({ data: [] });

      const result = await getMenuItems('cat1');
      
      // Should return empty array
      expect(result).toEqual([]);
    });
  });

  describe('getVenueById', () => {
    it('should fetch and transform venue data correctly', async () => {
      // Mock API response for venue
      const mockApiResponse = {
        data: {
          _id: "68187734a6d5090de7422456",
          name: "CINEMA CITY ARABIAN CENTRE",
          description: "Premier cinema dining experience",
          restaurantId: {
            _id: "rest1",
            name: "CINEMA CITY"
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await getVenueById('68187734a6d5090de7422456');

      // Check transformation
      expect(result).toEqual({
        id: "68187734a6d5090de7422456",
        name: "CINEMA CITY ARABIAN CENTRE",
        description: "Premier cinema dining experience",
        restaurantId: "rest1",
        restaurantName: "CINEMA CITY"
      });

      // Verify correct URL
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/venues/68187734a6d5090de7422456')
      );
    });

    it('should handle venue not found error', async () => {
      // Mock API error for venue not found
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: 'Venue not found' }
        }
      });

      // Should throw VenueNotFoundError
      await expect(getVenueById('invalid-venue'))
        .rejects
        .toThrow(VenueNotFoundError);
    });
  });

  describe('getVenueMenuItems', () => {
    it('should fetch and transform venue menu items correctly', async () => {
      // Mock API response
      const mockApiResponse = {
        data: [
          {
            _id: 'item1',
            name: 'Popcorn',
            description: 'Fresh buttered popcorn',
            price: 5.99,
            image: 'popcorn.jpg',
            categories: ['cat1'],
            isAvailable: true,
            isActive: true
          },
          {
            _id: 'item2',
            name: 'Nachos',
            description: 'Crispy nachos with cheese',
            price: 7.99,
            image: 'nachos.jpg',
            categories: ['cat1'],
            isAvailable: true,
            isActive: true
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await getVenueMenuItems('venue1');

      // Check transformation
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'item1',
        name: 'Popcorn',
        description: 'Fresh buttered popcorn',
        price: 5.99,
        image: 'popcorn.jpg',
        imageSearchTerm: '',
        category: 'cat1',
        categoryId: 'cat1',
        subcategory: undefined,
        featured: false,
        popular: false,
        tags: []
      });

      // Verify correct URL
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/venues/venue1/menu-items')
      );
    });

    it('should handle empty venue menu items', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] });

      const result = await getVenueMenuItems('venue1');
      expect(result).toEqual([]);
    });

    it('should handle venue not found error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: 'Venue not found' }
        }
      });

      await expect(getVenueMenuItems('invalid-venue'))
        .rejects
        .toThrow(VenueNotFoundError);
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      });

      await expect(getVenueMenuItems('venue1'))
        .rejects
        .toThrow(ApiError);
    });
  });

  describe('getFullMenuHierarchy', () => {
    it('should fetch and transform complete menu hierarchy for Cinema City venue', async () => {
      // Mock venue response with actual Cinema City data structure
      const mockVenueResponse = {
        data: {
          _id: "68187734a6d5090de7422456",
          name: "CINEMA CITY ARABIAN CENTRE",
          description: "Premier cinema dining venue",
          restaurantId: {
            _id: "rest1",
            name: "CINEMA CITY"
          }
        }
      };

      // Mock categories response
      const mockCategoriesResponse = {
        data: [
          {
            _id: "cat1",
            name: "Snacks",
            description: "Cinema snacks and treats",
            image: "snacks.jpg",
            isActive: true,
            order: 1
          },
          {
            _id: "cat2",
            name: "Beverages",
            description: "Refreshing drinks",
            image: "beverages.jpg",
            isActive: true,
            order: 2
          }
        ]
      };

      // Mock menu items response
      const mockMenuItemsResponse = {
        data: [
          {
            _id: "item1",
            name: "Large Popcorn",
            description: "Fresh buttered popcorn",
            price: 5.99,
            image: "popcorn.jpg",
            categories: ["cat1"],
            isAvailable: true,
            isActive: true
          },
          {
            _id: "item2",
            name: "Soft Drink",
            description: "Choice of carbonated beverages",
            price: 3.99,
            image: "drink.jpg",
            categories: ["cat2"],
            isAvailable: true,
            isActive: true
          }
        ]
      };

      // Set up mock responses in sequence
      mockedAxios.get
        .mockResolvedValueOnce(mockVenueResponse)
        .mockResolvedValueOnce(mockCategoriesResponse)
        .mockResolvedValueOnce(mockMenuItemsResponse);

      const result = await getFullMenuHierarchy("68187734a6d5090de7422456");

      // Verify restaurant data
      expect(result.restaurant).toEqual({
        id: "68187734a6d5090de7422456",
        name: "CINEMA CITY ARABIAN CENTRE",
        description: "Premier cinema dining venue",
        restaurantId: "rest1",
        restaurantName: "CINEMA CITY"
      });

      // Verify categories
      expect(result.categories).toHaveLength(2);
      expect(result.categories[0]).toEqual({
        id: "cat1",
        name: "Snacks",
        description: "Cinema snacks and treats",
        image: "snacks.jpg",
        order: 1
      });

      // Verify menu items
      expect(result.menuItems).toHaveLength(2);
      expect(result.menuItems[0]).toEqual({
        id: "item1",
        name: "Large Popcorn",
        description: "Fresh buttered popcorn",
        price: 5.99,
        image: "popcorn.jpg",
        imageSearchTerm: "",
        category: "cat1",
        categoryId: "cat1",
        subcategory: undefined,
        featured: false,
        popular: false,
        tags: []
      });

      // Verify API calls
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/venues/68187734a6d5090de7422456')
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/categories')
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/venues/68187734a6d5090de7422456/menu-items')
      );
    });

    it('should handle venue not found in hierarchy fetch', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: 'Venue not found' }
        }
      });

      await expect(getFullMenuHierarchy('invalid-venue'))
        .rejects
        .toThrow(VenueNotFoundError);
    });

    it('should handle empty menu hierarchy', async () => {
      // Mock responses for a venue with no menu items or categories
      const mockVenueResponse = {
        data: {
          _id: "68187734a6d5090de7422456",
          name: "CINEMA CITY ARABIAN CENTRE",
          restaurantId: {
            _id: "rest1",
            name: "CINEMA CITY"
          }
        }
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockVenueResponse)
        .mockResolvedValueOnce({ data: [] }) // empty categories
        .mockResolvedValueOnce({ data: [] }); // empty menu items

      const result = await getFullMenuHierarchy("68187734a6d5090de7422456");

      expect(result.restaurant).toBeDefined();
      expect(result.categories).toHaveLength(0);
      expect(result.menuItems).toHaveLength(0);
    });

    it('should handle API errors during hierarchy fetch', async () => {
      // Mock venue success but categories failure
      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            _id: "68187734a6d5090de7422456",
            name: "CINEMA CITY ARABIAN CENTRE"
          }
        })
        .mockRejectedValueOnce({
          response: {
            status: 500,
            data: { error: 'Internal server error' }
          }
        });

      await expect(getFullMenuHierarchy("68187734a6d5090de7422456"))
        .rejects
        .toThrow(ApiError);
    });
  });

