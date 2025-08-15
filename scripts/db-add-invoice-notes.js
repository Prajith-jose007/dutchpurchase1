
// scripts/db-add-invoice-notes.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function addInvoiceNotesColumn() {
  console.log('Starting to add `notes` column to the `invoices` table...');
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
      console.log('Altering `invoices` table to add `notes`...');
      await connection.query(
        "ALTER TABLE `invoices` ADD COLUMN `notes` TEXT NULL DEFAULT NULL"
      );
      console.log('Successfully added `notes` column to `invoices` table.');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('`notes` column already exists in `invoices` table. Skipping.');
      } else {
        throw error;
      }
    }

    try {
        console.log('Altering `invoices` table to make `fileName` a primary key to avoid duplicates...');
        // First remove existing primary key if one exists on another column
        try {
            await connection.query("ALTER TABLE `invoices` DROP PRIMARY KEY");
        } catch (pkError) {
            // Ignore if no primary key exists
        }
        await connection.query(
          "ALTER TABLE `invoices` ADD PRIMARY KEY (`fileName`)"
        );
        console.log('Successfully set `fileName` as primary key on `invoices` table.');
    } catch (error) {
       if (error.code === 'ER_MULTIPLE_PRI_KEY') {
        console.log('A primary key already exists. Skipping setting a new one on `fileName`.');
      } else {
        throw error;
      }
    }

    console.log('Database schema update for invoice notes completed successfully!');

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

addInvoiceNotesColumn();
