
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
 * This parser is designed to handle space-delimited text files.
 * @param rawData The raw string data from an inventory file.
 * @returns An array of parsed Item objects.
 */
export function parseInventoryData(rawData: string): Item[] {
  const lines = rawData.split('\n');
  const items: Item[] = [];

  // Skip the header line.
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 5) continue; // Basic validation

    const code = parts[0];
    const price = parseFloat(parts[parts.length - 1]);
    const shelfLifeDays = parseInt(parts[parts.length - 2], 10);
    const packing = parseFloat(parts[parts.length - 3]);
    const units = parts[parts.length - 4];
    
    if (isNaN(price) || isNaN(shelfLifeDays) || isNaN(packing)) {
      console.warn(`Skipping invalid line: ${line}`);
      continue;
    }

    // The rest of the parts form the description block
    const descriptionParts = parts.slice(1, -4);
    
    let remark: string | null = null;
    if (KNOWN_REMARKS.includes(descriptionParts[0].toUpperCase())) {
        remark = descriptionParts.shift()!;
    }

    let itemType = 'DRY'; // Default type
    let category = 'MISC'; // Default category
    let typeIndex = -1;

    // Check for multi-word types first
    const joinedDesc = descriptionParts.join(' ');
    for (const type of KNOWN_ITEM_TYPES_MULTI_WORD) {
        if (joinedDesc.toUpperCase().startsWith(type)) {
            itemType = type;
            typeIndex = type.split(' ').length;
            break;
        }
    }
    
    // If no multi-word type found, check for single-word types
    if (typeIndex === -1) {
        if (KNOWN_ITEM_TYPES_SINGLE_WORD.includes(descriptionParts[0].toUpperCase())) {
            itemType = descriptionParts[0];
            typeIndex = 1;
        }
    }
    
    // The category is the word right after the item type
    if (typeIndex !== -1 && descriptionParts.length > typeIndex) {
        category = descriptionParts[typeIndex];
    }

    // Everything after the type and category is the main description.
    const descriptionStartIndex = (typeIndex !== -1) ? (typeIndex + (category !== 'MISC' ? 1 : 0)) : 0;
    const description = descriptionParts.slice(descriptionStartIndex).join(' ');


    items.push({
      code,
      remark: remark ? capitalize(remark) : null,
      itemType: capitalize(itemType),
      category: capitalize(category),
      description: capitalize(description),
      detailedDescription: null, // This parser version doesn't handle detailed description
      units: units.toUpperCase(),
      packing,
      shelfLifeDays,
      price,
    });
  }

  return items;
}

    