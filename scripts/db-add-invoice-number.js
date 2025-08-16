
// scripts/db-add-invoice-number.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function addInvoiceNumberColumn() {
  console.log('Starting to add `invoiceNumber` and `invoiceNotes` columns to `orders` table...');
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
      console.log('Altering `orders` table to add `invoiceNumber`...');
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `invoiceNumber` VARCHAR(255) NULL DEFAULT NULL AFTER `totalPrice`"
      );
      console.log('Successfully added `invoiceNumber` column to `orders` table.');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('`invoiceNumber` column already exists in `orders` table. Skipping.');
      } else {
        throw error;
      }
    }

    try {
      console.log('Altering `orders` table to add `invoiceNotes`...');
      await connection.query(
        "ALTER TABLE `orders` ADD COLUMN `invoiceNotes` TEXT NULL DEFAULT NULL AFTER `invoiceNumber`"
      );
      console.log('Successfully added `invoiceNotes` column to `orders` table.');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('`invoiceNotes` column already exists in `orders` table. Skipping.');
      } else {
        throw error;
      }
    }

    console.log('Database schema update for invoice details completed successfully!');

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

addInvoiceNumberColumn();
