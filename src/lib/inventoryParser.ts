
import type { Item } from '@/lib/types';

// These are keywords that help identify different parts of a description line.
const KNOWN_REMARKS = ["NEW", "ROBO", "CATER"];
const KNOWN_ITEM_TYPES_MULTI_WORD = ["FRUITS & VEG"];
const KNOWN_ITEM_TYPES_SINGLE_WORD = [
  "MEAT", "SEAFOOD", "FROZEN", "DIARY", "DRY", "DRINKS"
];

// A helper function to capitalize the first letter of each word in a string.
const capitalize = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Parses raw inventory data text into an array of Item objects.
 * This parser is designed to be flexible and handle space-delimited columns.
 * @param rawData The raw string data from an inventory file.
 * @returns An array of parsed Item objects.
 */
export function parseInventoryData(rawData: string): Item[] {
  const lines = rawData.trim().split('\n');
  const items: Item[] = [];

  // Skip the header line if it exists.
  const dataLines = lines[0].toUpperCase().startsWith('CODE') ? lines.slice(1) : lines;

  for (const line of dataLines) {
    if (!line.trim()) continue;

    // Split by one or more spaces to handle space-delimited format.
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) continue; // Need at least code, description, and price.

    const code = parts[0];
    const price = parseFloat(parts[parts.length - 1]);
    const shelfLifeDays = parseInt(parts[parts.length - 2], 10);
    const packing = parseFloat(parts[parts.length - 3]);

    // Check for invalid numeric values at the end of the line.
    if (isNaN(price) || isNaN(shelfLifeDays) || isNaN(packing)) {
      console.warn(`Skipping invalid line due to parsing error: ${line}`);
      continue;
    }

    const descriptionParts = parts.slice(1, -3);
    let remark: string | null = null;
    if (KNOWN_REMARKS.includes(descriptionParts[0].toUpperCase())) {
        remark = descriptionParts.shift()!;
    }

    let itemType = 'DRY'; // Default type
    let category = 'MISC'; // Default category
    let typeIndex = -1;

    // Try to find a known item type in the description parts.
    for (const type of [...KNOWN_ITEM_TYPES_MULTI_WORD, ...KNOWN_ITEM_TYPES_SINGLE_WORD]) {
        const potentialType = descriptionParts.slice(0, type.split(' ').length).join(' ').toUpperCase();
        if (potentialType === type) {
            itemType = type;
            typeIndex = type.split(' ').length;
            break;
        }
    }
    
    // The category is the word right after the item type.
    if (typeIndex !== -1 && descriptionParts.length > typeIndex) {
        category = descriptionParts[typeIndex];
    }

    // Everything else is part of the main description.
    const descriptionStart = typeIndex !== -1 ? typeIndex + 1 : 0;
    const description = descriptionParts.slice(descriptionStart).join(' ');

    items.push({
      code,
      remark,
      itemType: capitalize(itemType),
      category: capitalize(category),
      description: capitalize(description) || 'N/A',
      detailedDescription: null, // This can be enhanced later if needed.
      units: 'KG', // Defaulting units, can be parsed if available.
      packing,
      shelfLifeDays,
      price,
    });
  }

  return items;
}
