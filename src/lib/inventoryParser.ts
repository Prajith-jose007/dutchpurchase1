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

    const parts = line.split(/\s+/);
    if (parts.length < 5) continue; // Basic validation for enough parts

    const code = parts[0];
    const shelfLifeDays = parseInt(parts[parts.length - 1], 10);
    const packing = parseFloat(parts[parts.length - 2]);
    const units = parts[parts.length - 3];

    if (isNaN(shelfLifeDays) || isNaN(packing)) continue; // Invalid numeric values

    let currentParts = parts.slice(1, parts.length - 3);
    let remark: string | null = null;
    let itemType = "Unknown";
    let category = "Unknown";
    let descriptionParts: string[] = [];

    // 1. Extract Remark
    if (KNOWN_REMARKS.includes(currentParts[0].toUpperCase())) {
      remark = currentParts[0].toUpperCase();
      currentParts.shift();
    }
    
    // 2. Extract ItemType
    let foundItemType = false;
    for (const multiWordType of KNOWN_ITEM_TYPES_MULTI_WORD) {
      const typeParts = multiWordType.split(' ');
      if (currentParts.slice(0, typeParts.length).join(' ').toUpperCase() === multiWordType) {
        itemType = multiWordType;
        currentParts = currentParts.slice(typeParts.length);
        foundItemType = true;
        break;
      }
    }
    if (!foundItemType) {
      if (KNOWN_ITEM_TYPES_SINGLE_WORD.includes(currentParts[0]?.toUpperCase())) {
        itemType = currentParts[0].toUpperCase();
        currentParts.shift();
        foundItemType = true;
      }
    }
    if (!foundItemType && remark === "CATER") { // If remark is CATER, it might also be the item type
        itemType = "CATER"; // Special handling for CATER items
    }


    // 3. Extract Category
    // The next word is usually the category. Some descriptions might start with words that look like categories.
    // This is heuristic. A more robust system would have predefined categories for each item type.
    if (currentParts.length > 0) {
        // A simple check: if the word is all caps or capitalized and not too long, assume it's a category
        const potentialCategory = currentParts[0];
        if (potentialCategory && (potentialCategory.toUpperCase() === potentialCategory || /^[A-Z][a-z]+$/.test(potentialCategory)) && potentialCategory.length < 15) {
             category = capitalize(potentialCategory);
             currentParts.shift();
        } else if (itemType === "DRY" && currentParts.length > 0) {
            // For DRY items, the next word is often a sub-category like BAKERY, CLEANING, COFFEE
            category = capitalize(currentParts[0]);
            currentParts.shift();
        }
    }
    
    // If category is still "Unknown" and itemType has a value, use a generic category or part of itemType
    if (category === "Unknown" && itemType !== "Unknown" && itemType !== "CATER") {
        category = itemType.split(' ')[0]; // e.g., "FRUITS" from "FRUITS & VEG"
    }


    // 4. The rest is description
    descriptionParts = currentParts;
    const description = capitalize(descriptionParts.join(' ').trim());
    
    // Default image based on a simple keyword search in description or category
    let hint = category.toLowerCase().split(" ")[0];
    if (description.toLowerCase().includes("apple")) hint = "apple";
    else if (description.toLowerCase().includes("banana")) hint = "banana";
    else if (description.toLowerCase().includes("chicken")) hint = "chicken";
    else if (description.toLowerCase().includes("beef")) hint = "beef";
    else if (description.toLowerCase().includes("fish")) hint = "fish";
    else if (description.toLowerCase().includes("bread")) hint = "bread";
    else if (description.toLowerCase().includes("milk")) hint = "milk";
    else if (description.toLowerCase().includes("cheese")) hint = "cheese";
    else if (description.toLowerCase().includes("tomato")) hint = "tomato";
    else if (description.toLowerCase().includes("onion")) hint = "onion";
    else if (description.toLowerCase().includes("potato")) hint = "potato";
    else if (description.toLowerCase().includes("rice")) hint = "rice";
    else if (description.toLowerCase().includes("oil")) hint = "oil";
     

    items.push({
      code,
      remark,
      itemType: capitalize(itemType),
      category: capitalize(category),
      description: description || "N/A",
      units: units.toUpperCase(),
      packing,
      shelfLifeDays,
      imageUrl: `https://placehold.co/300x200.png?text=${encodeURIComponent(description.substring(0,15))}`,
      // data-ai-hint attribute will be added in the component
    });
  }

  return items;
}
