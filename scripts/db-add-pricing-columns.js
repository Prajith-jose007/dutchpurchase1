// scripts/db-add-pricing-columns.js
require('dotenv').config();
const pool = require('../src/lib/db').default;

async function addPricingColumns() {
  console.log('Starting to add pricing columns to the database...');
  let connection;

  try {
    connection = await pool.getConnection();
    console.log('Successfully connected to the database.');

    // Add totalPrice to orders table
    try {
      console.log('Altering `orders` table...');
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `totalPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0.00"
      );
      console.log('Successfully added `totalPrice` column to `orders` table.');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('`totalPrice` column already exists in `orders` table. Skipping.');
      } else {
        throw error;
      }
    }

    // Add price to order_items table
    try {
      console.log('Altering `order_items` table...');
      await connection.query(
        "ALTER TABLE `order_items` ADD COLUMN `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00"
      );
      console.log('Successfully added `price` column to `order_items` table.');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('`price` column already exists in `order_items` table. Skipping.');
      } else {
        throw error;
      }
    }

    console.log('Database schema update for pricing completed successfully!');

  } catch (error) {
    console.error('Error during database schema update:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.release();
    }
    // Since the pool is managed, we may not need to explicitly end it if the app is still running.
    // For a script, it's good practice to ensure it exits.
    await pool.end();
  }
}

addPricingColumns();
