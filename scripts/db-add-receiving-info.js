
// scripts/db-add-receiving-info.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function addReceivingInfoColumns() {
  console.log('Starting to add receiving info columns to the database...');
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

    // Add receivedByUserId to orders table
    try {
      console.log('Altering `orders` table to add `receivedByUserId`...');
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `receivedByUserId` VARCHAR(255) NULL DEFAULT NULL"
      );
      console.log('Successfully added `receivedByUserId` column to `orders` table.');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('`receivedByUserId` column already exists in `orders` table. Skipping.');
      } else {
        throw error;
      }
    }

    // Add receivedAt to orders table
    try {
      console.log('Altering `orders` table to add `receivedAt`...');
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `receivedAt` DATETIME NULL DEFAULT NULL"
      );
      console.log('Successfully added `receivedAt` column to `orders` table.');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('`receivedAt` column already exists in `orders` table. Skipping.');
      } else {
        throw error;
      }
    }

    console.log('Database schema update for receiving info completed successfully!');

  } catch (error) {
    console.error('Error during database schema update:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.release();
    }
    // Ending the pool is necessary for the script to exit gracefully
    if (mysql.pool) {
      // A bit of a hack to access the pool if it's been created.
      // In a more robust setup, you'd manage the pool instance better.
      const singletonPool = mysql.createPool({ user: process.env.DB_USER });
      await singletonPool.end();
    }
     process.exit(0);
  }
}

addReceivingInfoColumns();
