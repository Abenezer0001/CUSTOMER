import fs from 'fs';
import path from 'path';
import { MenuItem } from '../src/types/menu';
import { 
  migrateMenuItemsToAPI,
  fetchAllMenuDataForUI,
  fetchCategories,
  fetchSubcategories
} from '../src/services/menuDataAdapter';

// Constants
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const MENU_ITEMS_PATH = path.join(DATA_DIR, 'menu-items-complete-final.json');
const ID_MAPPINGS_PATH = path.join(DATA_DIR, 'api-id-mappings.json');
const API_CATEGORIES_PATH = path.join(DATA_DIR, 'api-categories.json');
const MIGRATION_RESULT_PATH = path.join(DATA_DIR, 'migration-result.json');

/**
 * Read menu items from JSON file
 */
function readMenuItems(): MenuItem[] {
  try {
    console.log(`Reading menu items from ${MENU_ITEMS_PATH}`);
    const data = fs.readFileSync(MENU_ITEMS_PATH, 'utf8');
    const jsonData = JSON.parse(data);
    
    if (!jsonData.items || !Array.isArray(jsonData.items)) {
      throw new Error('Invalid menu items data structure');
    }
    
    return jsonData.items;
  } catch (error) {
    console.error('Error reading menu items:', error);
    throw error;
  }
}

/**
 * Save data to a JSON file
 */
function saveJsonToFile(data: any, filePath: string): void {
  try {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Data saved to ${filePath}`);
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
    throw error;
  }
}

/**
 * Validate the migration by checking if all items are in the API
 */
async function validateMigration(idMappings: Record<string, string>): Promise<boolean> {
  try {
    console.log('Validating migration...');
    
    // Fetch all menu items from the API
    const menuItems = await fetchAllMenuDataForUI();
    
    // Check that all mapped IDs exist in the fetched data
    const apiIds = menuItems.map(item => item.id);
    const mappedIds = Object.values(idMappings);
    
    const missingIds = mappedIds.filter(id => !apiIds.includes(id));
    
    if (missingIds.length > 0) {
      console.error(`Migration validation failed. Missing IDs: ${missingIds.join(', ')}`);
      return false;
    }
    
    console.log(`Migration validated successfully. All ${mappedIds.length} items found in API.`);
    return true;
  } catch (error) {
    console.error('Error validating migration:', error);
    return false;
  }
}

/**
 * Fetch and save API category structure for reference
 */
async function fetchAndSaveCategoryStructure(): Promise<void> {
  try {
    console.log('Fetching category structure from API...');
    
    const categories = await fetchCategories();
    const categoryStructure: Record<string, any> = {};
    
    for (const category of categories) {
      const subcategories = await fetchSubcategories(category._id);
      categoryStructure[category._id] = {
        name: category.name,
        subcategories: subcategories.map(sub => ({
          _id: sub._id,
          name: sub.name
        }))
      };
    }
    
    saveJsonToFile(categoryStructure, API_CATEGORIES_PATH);
    console.log('Category structure saved successfully.');
  } catch (error) {
    console.error('Error fetching and saving category structure:', error);
  }
}

/**
 * Main migration function
 */
async function migrateMenuData(): Promise<void> {
  try {
    console.log('Starting menu data migration...');
    
    // Step 1: Read existing menu items
    const menuItems = readMenuItems();
    console.log(`Read ${menuItems.length} menu items`);
    
    // Step 2: Migrate menu items to API
    console.log('Migrating menu items to API...');
    const idMappings = await migrateMenuItemsToAPI(menuItems);
    console.log(`Migrated ${Object.keys(idMappings).length} menu items to API`);
    
    // Step 3: Save ID mappings for future reference
    saveJsonToFile(idMappings, ID_MAPPINGS_PATH);
    
    // Step 4: Fetch and save category structure
    await fetchAndSaveCategoryStructure();
    
    // Step 5: Validate the migration
    const isValid = await validateMigration(idMappings);
    
    // Step 6: Fetch the migrated data from API and save as reference
    const migratedItems = await fetchAllMenuDataForUI();
    saveJsonToFile({
      migrationDate: new Date().toISOString(),
      migrationSuccess: isValid,
      itemCount: migratedItems.length,
      items: migratedItems
    }, MIGRATION_RESULT_PATH);
    
    console.log(`Migration ${isValid ? 'completed successfully' : 'completed with validation issues'}`);
    console.log(`Migrated ${migratedItems.length} items`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateMenuData()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error in migration script:', error);
    process.exit(1);
  });

