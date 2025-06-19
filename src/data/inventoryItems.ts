import type { Item } from '@/lib/types';
import { parseInventoryData } from '@/lib/inventoryParser';
import { rawInventoryData } from './rawInventoryData';

export const allItems: Item[] = parseInventoryData(rawInventoryData);

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
