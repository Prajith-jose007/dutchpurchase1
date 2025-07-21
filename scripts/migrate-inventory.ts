
require('dotenv').config();
import mysql from 'mysql2/promise';
import { rawInventoryData } from '../src/data/rawInventoryData';
import { parseInventoryData } from '../src/lib/inventoryParser';

async function migrateInventory() {
  console.log('Starting inventory data migration...');
  let connection: mysql.Connection | undefined;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });
    console.log('Successfully connected to the database.');

    const items = parseInventoryData(rawInventoryData);
    console.log(`Parsed ${items.length} items from raw data.`);

    if (items.length === 0) {
      console.log('No items to migrate. Exiting.');
      if (connection) await connection.end();
      return;
    }

    await connection.beginTransaction();
    
    // Clear the table before inserting new data to ensure a clean slate
    await connection.query('TRUNCATE TABLE items');
    console.log('Cleared existing items from the table.');
    
    let processedCount = 0;
    for (const item of items) {
        const values = [
            item.code, item.remark || null, item.itemType, item.category, 
            item.description, item.units, item.packing, item.shelfLifeDays, item.price
        ];

        // Since we truncated, we can just use INSERT.
        const sql = `
            INSERT INTO items (code, remark, itemType, category, description, units, packing, shelfLifeDays, price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
      await connection.query(sql, values);
      processedCount++;
    }

    await connection.commit();
    console.log(`Successfully migrated ${processedCount} inventory items to the database.`);

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error during inventory migration:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
}

migrateInventory();
