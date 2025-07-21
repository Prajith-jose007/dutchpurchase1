import type { Item } from '@/lib/types';

export const getItemByCode = (items: Item[], code: string): Item | undefined => {
  if (!items || items.length === 0) return undefined;
  return items.find(item => item.code === code);
};

export const getItemTypes = (items: Item[]): string[] => {
  if (!items) return [];
  const itemTypes = new Set(items.map(item => item.itemType).filter(Boolean));
  return Array.from(itemTypes).sort();
};

export const getCategories = (items: Item[], itemType?: string): string[] => {
  if (!items) return [];
  const categories = new Set(
    items
      .filter(item => (!itemType || item.itemType === itemType) && item.category)
      .map(item => item.category)
  );
  return Array.from(categories).sort();
};
