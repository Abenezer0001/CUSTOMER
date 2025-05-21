# Backend API Enhancements Required for Menu Integration

## Overview

This document outlines the backend API changes necessary to support the enhanced menu UI with real category images, subcategory counts, and proper venue/table display in the navigation header.

## Required Endpoint Updates

### 1. Table Verification Endpoint

**Endpoint:** `GET /api/tables/{tableId}/verify`

Ensure this endpoint returns complete data including:
- Full table details (number, capacity, status)
- Comprehensive venue information
- Relationships between entities

Example response:
```json
{
  "exists": true,
  "isAvailable": true,
  "table": {
    "_id": "t123456",
    "number": "A12",
    "capacity": 4,
    "isOccupied": false,
    "isActive": true,
    "venueId": "v789012"
  },
  "venue": {
    "_id": "v789012",
    "name": "Main Dining Room",
    "description": "Our elegant main dining area with garden views",
    "restaurantId": "r345678"
  }
}
```

### 2. Menu Endpoint with Full Population

**Endpoint:** `GET /api/menus?venueId={venueId}&populate=true`

Add a `populate` parameter that enhances the response with:
- Real category images (not placeholders)
- Subcategory counts for each category
- Subsubcategory counts for advanced classification
- Full hierarchical relationships between categories, subcategories, and subsubcategories

Example response:
```json
{
  "_id": "m123456",
  "name": "Lunch Menu",
  "description": "Available 11am-3pm daily",
  "venueId": {
    "_id": "v789012",
    "name": "Main Dining Room"
  },
  "categories": [
    {
      "_id": "c111111",
      "name": "Appetizers",
      "description": "Small plates to start your meal",
      "image": "/images/categories/appetizers.jpg",
      "subCategories": ["sc222222", "sc333333"],
      "subCategoryCount": 2,
      "totalSubSubCategoryCount": 5,
      "isActive": true
    }
  ],
  "subCategories": [
    {
      "_id": "sc222222",
      "name": "Hot Appetizers",
      "description": "Served warm",
      "image": "/images/subcategories/hot-appetizers.jpg",
      "categoryId": "c111111",
      "subSubCategories": ["ssc444444", "ssc555555"],
      "isActive": true
    }
  ]
}
```

## Data Requirements

### 1. Category Images
- All categories must have real, high-quality images
- Images should be properly sized and optimized (recommended: 800x600px, <200KB)
- Provide a default image for any category missing a custom image

### 2. Subcategory Structure
- Each category must have an accurate count of its subcategories
- Each subcategory must have an accurate count of its subsubcategories
- Consistent naming and hierarchy must be maintained

### 3. Venue and Table Information
- Venue names should be properly formatted for display in the header
- Table numbers should be user-friendly (e.g., "12" not "TABLE_12_ID")
- Ensure all venue and table data is up-to-date

## Implementation Guidelines

1. Update database schema to support new fields if necessary
2. Modify the existing API endpoints to include the additional data
3. Ensure proper error handling for missing or invalid data
4. Optimize query performance for the enhanced responses
5. Add appropriate caching mechanisms for frequently accessed data

## Testing Endpoints

To test your implementation, you can use the following curl commands:

```bash
# Test table verification
curl -X GET http://localhost:3001/api/tables/[TABLE_ID]/verify

# Test menu retrieval with full population
curl -X GET http://localhost:3001/api/menus?venueId=[VENUE_ID]&populate=true
```

Please contact the frontend team if you have any questions about these requirements.

