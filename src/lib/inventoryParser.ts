
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
 * This parser is designed to be flexible and handle both space-delimited and comma-delimited (CSV) formats.
 * @param rawData The raw string data from an inventory file.
 * @returns An array of parsed Item objects.
 */
export function parseInventoryData(rawData: string): Item[] {
  // Normalize line endings and filter out empty lines
  const lines = rawData.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== '');
  const items: Item[] = [];

  // Skip the header line if it exists.
  const headerLine = lines[0]?.toUpperCase() || '';
  const dataLines = (headerLine.startsWith('CODE') || headerLine.startsWith('"CODE"')) ? lines.slice(1) : lines;

  for (const line of dataLines) {
    if (!line.trim()) continue;

    // Detect delimiter: check if comma is more frequent than spaces in a sample of the line.
    const isCsv = (line.match(/,/g) || []).length > 3;
    const parts = isCsv 
        ? line.split(',').map(p => p.trim()) 
        : line.trim().split(/\s+/);
        
    if (parts.length < 5) {
        console.warn(`Skipping short/invalid line: ${line}`);
        continue;
    }

    const code = parts[0];
    const price = parseFloat(parts[parts.length - 1]);
    const shelfLifeDays = parseInt(parts[parts.length - 2], 10);
    const packing = parseFloat(parts[parts.length - 3]);
    const units = parts[parts.length - 4];
    
    if (isNaN(price) || isNaN(shelfLifeDays) || isNaN(packing) || !units) {
      console.warn(`Skipping invalid line due to numeric/unit parsing error: ${line}`);
      continue;
    }

    // The rest of the parts form the description block
    const descriptionParts = parts.slice(1, -4);
    
    let remark: string | null = null;
    if (KNOWN_REMARKS.includes(descriptionParts[0]?.toUpperCase())) {
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
        for (const type of KNOWN_ITEM_TYPES_SINGLE_WORD) {
            if (descriptionParts[0]?.toUpperCase() === type) {
                itemType = type;
                typeIndex = 1;
                break;
            }
        }
    }
    
    // The category is the word right after the item type
    if (typeIndex !== -1 && descriptionParts.length > typeIndex) {
        category = descriptionParts[typeIndex];
    }

    // Everything after the type and category is the main description.
    const descriptionStartIndex = (typeIndex !== -1) ? (typeIndex + (category !== 'MISC' ? 1 : 0)) : 0;
    const descriptionSlice = descriptionParts.slice(descriptionStartIndex);
    
    const description = descriptionSlice.length > 0 ? descriptionSlice.join(' ') : 'N/A';

    // The detailed description is often the second major part in CSVs
    let detailedDescription : string | null = null;
    if (isCsv && parts.length > 6) { // Heuristic for CSVs
        if (parts[1] && parts[1].toUpperCase() !== remark?.toUpperCase()) {
            detailedDescription = parts[1];
        }
    }


    items.push({
      code,
      remark: remark ? capitalize(remark) : null,
      itemType: capitalize(itemType),
      category: capitalize(category),
      description: capitalize(description),
      detailedDescription: detailedDescription ? capitalize(detailedDescription) : null,
      units: units.toUpperCase(),
      packing,
      shelfLifeDays,
      price,
    });
  }

  return items;
}
