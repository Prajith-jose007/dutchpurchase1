
"use server";

import fs from 'fs/promises';
import path from 'path';

// WARNING: This approach of writing to the file system has limitations.
// It will only work in environments where the file system is writable,
// like a standard Node.js server or during local development (`npm run dev`).
// It will NOT work in serverless environments like Vercel or Firebase Functions
// where the file system is read-only.

const inventoryFilePath = path.join(process.cwd(), 'src', 'data', 'rawInventoryData.ts');

export async function getRawInventoryDataAction(): Promise<string> {
    try {
        const fileContent = await fs.readFile(inventoryFilePath, 'utf-8');
        // Extract the content within the backticks
        const match = fileContent.match(/export const rawInventoryData = `\n([\s\S]*?)\n`;/);
        return match ? match[1].trim() : '';
    } catch (error) {
        console.error("Failed to read inventory data:", error);
        throw new Error("Could not load inventory data file.");
    }
}

export async function updateInventoryAction(newData: string): Promise<{ success: boolean, error?: string }> {
    try {
        // We need to wrap the raw data back into the TypeScript export format
        const fileContent = `
export const rawInventoryData = \`
${newData.trim()}
\`;
`;
        await fs.writeFile(inventoryFilePath, fileContent.trim(), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error("Failed to write inventory data:", error);
        return { success: false, error: 'Failed to save inventory data file. Check server permissions.' };
    }
}
