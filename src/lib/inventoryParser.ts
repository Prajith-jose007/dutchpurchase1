
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
  // Normalize line endings to handle both Windows and Unix style files
  const lines = rawData.replace(/\r\n/g, '\n').trim().split('\n');
  const items: Item[] = [];

  // Skip the header line if it exists.
  const dataLines = lines[0].toUpperCase().startsWith('CODE') ? lines.slice(1) : lines;

  for (const line of dataLines) {
    // Ignore empty or whitespace-only lines
    if (!line.trim()) continue;

    const parts = line.trim().split(/\s+/);
    // A valid line must have at least a code, one word of description, packing, shelf life, and price.
    if (parts.length < 5) {
        console.warn(`Skipping short/invalid line: ${line}`);
        continue;
    }

    const code = parts[0];
    const price = parseFloat(parts[parts.length - 1]);
    const shelfLifeDays = parseInt(parts[parts.length - 2], 10);
    const packing = parseFloat(parts[parts.length - 3]);
    // The units are now assumed to be the 4th part from the end
    const units = parts[parts.length - 4];

    if (isNaN(price) || isNaN(shelfLifeDays) || isNaN(packing) || !units) {
      console.warn(`Skipping invalid line due to numeric/unit parsing error: ${line}`);
      continue;
    }
    
    // The description is everything between the first part (code) and the last four parts (units, packing, shelfLife, price)
    const descriptionParts = parts.slice(1, -4);
    
    let remark: string | null = null;
    if (KNOWN_REMARKS.includes(descriptionParts[0]?.toUpperCase())) {
        remark = descriptionParts.shift()!;
    }

    let itemType = 'DRY'; // Default type
    let category = 'MISC'; // Default category
    let typeIndex = -1;

    // Check for multi-word types first
    for (const type of KNOWN_ITEM_TYPES_MULTI_WORD) {
        const typeParts = type.split(' ');
        if (descriptionParts.slice(0, typeParts.length).join(' ').toUpperCase() === type) {
            itemType = type;
            typeIndex = typeParts.length;
            break;
        }
    }
    
    // If no multi-word type found, check for single-word types
    if (typeIndex === -1) {
        for (const type of KNOWN_ITEM_TYPES_SINGLE_WORD) {
            if (descriptionParts[0]?.toUpperCase() === type) {
                itemType = type;
                typeIndex = 1;
                break;
            }
        }
    }
    
    // The category is the word right after the item type, if a type was found
    if (typeIndex !== -1 && descriptionParts.length > typeIndex) {
        category = descriptionParts[typeIndex];
    }

    // Everything else is part of the main description.
    const descriptionStartIndex = (typeIndex !== -1) ? (typeIndex + 1) : 0;
    const descriptionSlice = descriptionParts.slice(descriptionStartIndex);
    
    // Join the remaining parts to form the description, defaulting to 'N/A' if empty
    const description = descriptionSlice.length > 0 ? descriptionSlice.join(' ') : 'N/A';

    items.push({
      code,
      remark: remark ? capitalize(remark) : null,
      itemType: capitalize(itemType),
      category: capitalize(category),
      description: capitalize(description),
      detailedDescription: null,
      units: units.toUpperCase(),
      packing,
      shelfLifeDays,
      price,
    });
  }

  return items;
}
