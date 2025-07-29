// src/lib/displayUtils.ts
import type { Item } from './types';

/**
 * Determines the most user-friendly unit to display on a product card.
 * - Shows "Litre" for oils.
 * - Shows "Pack" for items sold in multi-unit packs.
 * - Defaults to the item's stored unit for single items.
 * @param item The inventory item.
 * @returns A string representing the user-friendly display unit.
 */
export const getDisplayUnit = (item: Item): string => {
  const description = item.description.toLowerCase();
  const units = item.units.toUpperCase();

  // Rule 1: Handle liquids like oil, measured in Litres.
  if (description.includes('oil') || units === 'LITRE') {
    return 'Litre';
  }

  // Rule 2: If packing is greater than 1, it's a pack.
  if (item.packing > 1) {
    return 'Pack';
  }
  
  // Rule 3: Default to the item's own unit for single items (KG, PCS, etc.)
  return item.units;
};
