# INSEAT Menu Integration

This document provides guidance for developers working with the INSEAT menu integration, particularly focusing on the TableHeader component and category display enhancements.

## Overview

We've enhanced the menu UI to provide a better user experience by:

1. Showing venue name on the left edge of the navbar
2. Displaying table name in the center of the navbar
3. Using real category images instead of placeholder images
4. Showing accurate subcategory and subsubcategory counts

## Component Structure

### TableHeader

The `TableHeader` component accepts two main props:

```typescript
interface TableHeaderProps {
  venueName?: string; // The venue name to display on left edge
  tableName?: string; // The table name to display in center
}
```

Example usage:

```tsx
<TableHeader 
  venueName="Main Dining Room" 
  tableName="A12" 
/>
```

### CategoryGrid

The `CategoryGrid` component has been updated to display enhanced category information:

```typescript
interface Category {
  id: string;
  _id?: string;
  name: string;
  image: string;
  subCategories: string[];
  subCategoryCount: number;
  totalSubSubCategoryCount: number;
}

interface CategoryGridProps {
  categories: Category[];
}
```

Example usage:

```tsx
<CategoryGrid categories={formattedCategories} />
```

## Testing

### Using TableHeaderTest

We've included a test component to help verify the TableHeader implementation:

1. Navigate to `/test/header` in your browser
2. Use the provided controls to:
   - Adjust viewport width (mobile, tablet, desktop)
   - Test different venue and table name combinations
   - Try edge cases like empty values or very long names

### Category Display Testing

To test the enhanced category display:

1. Ensure backend API provides the required data format
2. Verify real images are displayed and subcategory counts are accurate
3. Check responsive behavior on different screen sizes

## Implementation Notes

### Venue Name Truncation

Long venue names will be truncated on mobile devices to prevent layout issues. The truncation includes:

- Maximum width of 120px
- Text overflow with ellipsis
- Preserved readability of the table name in center

### Image Error Handling

The CategoryGrid component includes error handling for images:

```tsx
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = '/placeholder-category.jpg';
};
```

This ensures a fallback image is displayed if the real image fails to load.

## Backend API Requirements

The frontend implementation expects the backend to provide:

1. Venue and table information in table verification response
2. Real category images in menu response
3. Accurate subcategory and subsubcategory counts

See `docs/backend-enhancements.md` for detailed API requirements.

## Troubleshooting

Common issues:

1. **Missing venue/table information**: Ensure tableData is properly fetched and passed to TableHeader
2. **Category images not loading**: Check network requests and confirm backend returns valid image URLs
3. **Subcategory counts incorrect**: Verify API response contains accurate category relationship data

## Future Enhancements

Planned improvements:

1. Further customization options for the TableHeader (colors, branding)
2. Enhanced accessibility for venue and table information
3. Better performance optimization for category image loading

