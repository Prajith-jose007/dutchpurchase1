
import type { Item } from '@/lib/types';
import { getItemsAction } from '@/lib/actions';


// The allItems array is no longer managed here.
// Data should be fetched directly inside the components that need it.


export const getItemByCode = (items: Item[], code: string): Item | undefined => {
  return items.find(item => item.code === code);
};

export const getItemTypes = (items: Item[]): string[] => {
  const itemTypes = new Set(items.map(item => item.itemType));
  return Array.from(itemTypes).sort();
};

export const getCategories = (items: Item[], itemType?: string): string[] => {
  const categories = new Set(
    items
      .filter(item => !itemType || item.itemType === itemType)
      .map(item => item.category)
  );
  return Array.from(categories).sort();
};
