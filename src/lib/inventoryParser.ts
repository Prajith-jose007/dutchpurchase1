

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
 * It can handle descriptions that are quoted to contain spaces.
 * @param rawData The raw string data from an inventory file.
 * @returns An array of parsed Item objects.
 */
export function parseInventoryData(rawData: string): Item[] {
  const lines = rawData.trim().split('\n');
  const items: Item[] = [];
  
  // Skip the header line.
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 6) continue; // CODE, TYPE, CATEGORY, UNITS, PACKING, SHELF, PRICE

    try {
        const code = parts[0];
        const price = parseFloat(parts[parts.length - 1]);
        const shelfLifeDays = parseInt(parts[parts.length - 2], 10);
        const packing = parseFloat(parts[parts.length - 3]);
        const units = parts[parts.length - 4].toUpperCase();

        if (isNaN(price) || isNaN(shelfLifeDays) || isNaN(packing)) {
            console.warn(`Skipping line due to invalid numeric values: ${line}`);
            continue;
        }

        const descParts = parts.slice(1, -4);
        
        let remark: string | null = null;
        if (KNOWN_REMARKS.includes(descParts[0].toUpperCase())) {
            remark = capitalize(descParts.shift()!);
        }

        let itemType: string;
        let category: string;
        let description: string;

        // Check for multi-word item types first
        const twoWordType = `${descParts[0]} ${descParts[1]}`;
        if (KNOWN_ITEM_TYPES_MULTI_WORD.includes(twoWordType.toUpperCase())) {
            itemType = twoWordType;
            category = descParts[2];
            description = descParts.slice(3).join(' ');
        } else if (KNOWN_ITEM_TYPES_SINGLE_WORD.includes(descParts[0].toUpperCase())) {
            itemType = descParts[0];
            category = descParts[1];
            description = descParts.slice(2).join(' ');
        } else {
            // Default case if type/category parsing is ambiguous
            itemType = descParts[0];
            category = descParts[1] || 'Misc';
            description = descParts.slice(2).join(' ');
        }
        
        items.push({
          code,
          remark,
          itemType: capitalize(itemType),
          category: capitalize(category),
          description: capitalize(description),
          units,
          packing,
          shelfLifeDays,
          price,
        });

    } catch (e) {
        console.error(`Failed to parse line: "${line}"`, e);
    }
  }

  return items;
}

    