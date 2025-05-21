# Backend API Enhancements for Menu Integration

This document outlines the necessary backend API enhancements to support the improved menu UI with real category images, subcategory counts, and venue/table display.

## API Endpoint Updates

### 1. Table Verification Endpoint

**Endpoint:** `GET /api/tables/{tableId}/verify`

Ensure this endpoint returns:
- Table information including number, capacity, and active status
- Complete venue information with name and description
- Restaurant ID for additional queries if needed

### 2. Menu Endpoint with Full Population

**Endpoint:** `GET /api/menus?venueId={venueId}&populate=true`

Update this endpoint to:
- Include real category images (not placeholder URLs)
- Add `subCategoryCount` to each category
- Provide a count of total subsubcategories per category
- Return the proper hierarchy of categories → subcategories → subsubcategories

### 3. Categories Population

When retrieving categories, include:
- Real image URLs for each category
- Count of subcategories under each category
- Count of menu items in each category
- Additional

