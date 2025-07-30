
import type { Item } from '@/lib/types';

// A helper function to capitalize the first letter of each word in a string.
const capitalize = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Parses raw inventory data from a CSV file into an array of Item objects.
 * This parser is designed to handle comma-separated values.
 * It trims whitespace from each field and handles quoted fields.
 * @param rawData The raw string data from an inventory CSV file.
 * @returns An array of parsed Item objects.
 */
export function parseInventoryData(rawData: string): Item[] {
  const lines = rawData.trim().split('\n');
  if (lines.length < 2) {
    // Needs at least a header and one data line
    return [];
  }
  
  const items: Item[] = [];
  // Use a regex that can handle spaces in the header names.
  const header = lines[0].split(',').map(h => h.trim().toUpperCase());
  
  const colMap: { [key: string]: number } = {
    CODE: header.indexOf('CODE'),
    REMARK: header.indexOf('REMARK'),
    TYPE: header.indexOf('TYPE'),
    CATEGORY: header.indexOf('CATEGORY'),
    DESCRIPTION: header.indexOf('DESCRIPTION'),
    DETAILED: header.indexOf('DETAILED'),
    UNITS: header.indexOf('UNITS'),
    PACKING: header.indexOf('PACKING'),
    LOWEST: header.indexOf('LOWEST'), // This is the price
  };

  // Basic validation to ensure all required headers are present
  const requiredHeaders = ['CODE', 'DESCRIPTION', 'UNITS', 'PACKING', 'LOWEST'];
  for (const h of requiredHeaders) {
    if (colMap[h] === -1) {
      console.error(`Missing required header in CSV: ${h}`);
      return [];
    }
  }


  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // This regex handles comma-separated values, including those in quotes
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/"/g, '').trim());

    try {
      const price = parseFloat(parts[colMap.LOWEST]);
      const packing = parseFloat(parts[colMap.PACKING]);

      if (isNaN(price) || isNaN(packing)) {
        console.warn(`Skipping line due to invalid numeric values: ${line}`);
        continue;
      }
      
      const item: Item = {
        code: parts[colMap.CODE],
        remark: parts[colMap.REMARK] || null,
        itemType: capitalize(parts[colMap.TYPE] || ''),
        category: capitalize(parts[colMap.CATEGORY] || ''),
        description: capitalize(parts[colMap.DESCRIPTION] || ''),
        detailedDescription: capitalize(parts[colMap.DETAILED] || '') || null,
        units: parts[colMap.UNITS].toUpperCase(),
        packing,
        price,
      };

      items.push(item);

    } catch (e) {
      console.error(`Failed to parse line: "${line}"`, e);
    }
  }

  return items;
}
