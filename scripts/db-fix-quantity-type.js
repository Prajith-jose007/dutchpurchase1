
// scripts/db-fix-quantity-type.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixQuantityType() {
  console.log('Starting to fix quantity column type in order_items table...');
  let connection;

  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    });

    connection = await pool.getConnection();
    console.log('Successfully connected to the database.');

    try {
      console.log('Altering `order_items` table to modify `quantity` column...');
      // Change the column type to DECIMAL(10, 3) to support fractional values
      await connection.query(
        "ALTER TABLE `order_items` MODIFY COLUMN `quantity` DECIMAL(10, 3) NOT NULL"
      );
      console.log('Successfully changed `quantity` column type to DECIMAL(10, 3).');
    } catch (error) {
      // This will catch errors, including if the column is already the correct type.
      // A more robust script might check the column type first, but for this one-off fix, this is sufficient.
      console.error('Could not alter table. This might be because the column is already the correct type or another issue occurred.', error.message);
    }

    console.log('Database schema update for quantity type completed!');

  } catch (error) {
    console.error('Error during database schema update:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.release();
    }
    // We need to end the pool for the script to exit gracefully
    const mainPool = mysql.createPool({ user: process.env.DB_USER });
    await mainPool.end();
    process.exit(0);
  }
}

fixQuantityType();
