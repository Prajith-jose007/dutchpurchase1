
// scripts/db-add-pricing-columns.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function addPricingColumns() {
  console.log('Starting to add pricing columns to the database...');
  let connection;

  try {
    // Create a new connection pool directly in this script to avoid import issues
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      waitForConnections: true,
      connectionLimit: 1, // Only need one connection for this script
      queueLimit: 0,
    });

    connection = await pool.getConnection();
    console.log('Successfully connected to the database.');

    // Add totalPrice to orders table
    try {
      console.log('Altering `orders` table...');
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `totalPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0.00"
      );
      console.log('Successfully added `totalPrice` column to `orders` table.');
    } catch (error) {
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
    } catch (error) {
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
      const pool = connection.pool;
      if (pool) {
        pool.end();
      }
    }
  }
}

addPricingColumns();
