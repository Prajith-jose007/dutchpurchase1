
import type { Item } from '@/lib/types';

const KNOWN_REMARKS = ["NEW", "ROBO", "CATER"];
const KNOWN_ITEM_TYPES_MULTI_WORD = ["FRUITS & VEG"]; // Order by length if there are overlaps, longest first
const KNOWN_ITEM_TYPES_SINGLE_WORD = [
  "MEAT", "SEAFOOD", "FROZEN", "DIARY", "DRY", "DRINKS"
];

// Helper to capitalize first letter of each word
const capitalize = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

export function parseInventoryData(rawData: string): Item[] {
    const lines = rawData.trim().split('\n');
    const items: Item[] = [];
  
    // Skip header line if present
    const dataLines = lines[0].toUpperCase().startsWith('CODE') ? lines.slice(1) : lines;
  
    for (const line of dataLines) {
      if (!line.trim()) continue;
  
      // Split by comma, as it's a CSV
      const parts = line.split(',');
  
      if (parts.length < 8) continue; // Must have at least the columns up to PRICE
  
      const code = parts[0]?.trim();
      const remark = parts[1]?.trim() || null;
      const itemType = parts[2]?.trim();
      const category = parts[3]?.trim();
      const description = parts[4]?.trim();
      const detailedDescription = parts[5]?.trim() || null;
      const units = parts[6]?.trim();
      const packing = parseFloat(parts[7]);
      // shelfLifeDays is no longer in the CSV, so we use a default.
      const shelfLifeDays = 180; 
      const price = parseFloat(parts[8]);

      if (!code || isNaN(packing) || isNaN(price)) {
          console.warn(`Skipping invalid line: ${line}`);
          continue;
      }
  
      items.push({
        code,
        remark: remark === 'null' || remark === '' ? null : remark,
        itemType: capitalize(itemType || 'Unknown'),
        category: capitalize(category || 'Unknown'),
        description: capitalize(description || 'N/A'),
        detailedDescription: detailedDescription ? capitalize(detailedDescription) : null,
        units: units.toUpperCase(),
        packing,
        shelfLifeDays,
        price,
      });
    }
  
    return items;
  }
