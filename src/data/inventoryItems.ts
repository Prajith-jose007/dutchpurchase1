import type { Item } from '@/lib/types';
import { getItemsAction } from '@/lib/actions';

// This data is now fetched from the database at runtime.
export let allItems: Item[] = [];

// Initialize items from the database.
// This will be executed once when the module is first imported on the server.
getItemsAction().then(items => {
    allItems = items;
}).catch(error => {
    console.error("Failed to initialize inventory from database:", error);
    // In case of DB error, the app will run with an empty inventory.
    // A more robust solution might involve a fallback to a static file.
    allItems = []; 
});


export const getItemByCode = (code: string): Item | undefined => {
  return allItems.find(item => item.code === code);
};

export const getItemTypes = (): string[] => {
  const itemTypes = new Set(allItems.map(item => item.itemType));
  return Array.from(itemTypes).sort();
};

export const getCategories = (itemType?: string): string[] => {
  const categories = new Set(
    allItems
      .filter(item => !itemType || item.itemType === itemType)
      .map(item => item.category)
  );
  return Array.from(categories).sort();
};
