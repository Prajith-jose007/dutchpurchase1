
// scripts/db-add-detailed-description.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function addDetailedDescriptionColumn() {
  console.log('Starting to add `detailedDescription` column to the `items` table...');
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

    // Add detailedDescription column
    try {
      await connection.query(
        "ALTER TABLE `items` ADD COLUMN `detailedDescription` TEXT NULL DEFAULT NULL AFTER `description`"
      );
      console.log('Successfully added `detailedDescription` column.');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('`detailedDescription` column already exists. Skipping.');
      } else {
        throw error;
      }
    }

    console.log('Database schema update for `detailedDescription` completed successfully!');

  } catch (error) {
    console.error('Error during database schema update:', error);
    process.exit(1);
  } finally {
    if (connection) {
       await connection.release();
       const pool = connection.pool;
       if(pool){
           pool.end();
       }
    }
  }
}

addDetailedDescriptionColumn();
