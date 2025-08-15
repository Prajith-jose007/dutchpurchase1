
// scripts/db-add-invoice-notes.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function addInvoiceNotesColumn() {
  console.log('Starting to add/update columns in the `invoices` table...');
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

    // Add id column if not exists
    try {
        await connection.query("ALTER TABLE `invoices` ADD COLUMN `id` INT AUTO_INCREMENT PRIMARY KEY FIRST");
        console.log("Successfully added `id` as primary key.");
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("`id` column already exists.");
        } else if (error.code === 'ER_MULTIPLE_PRI_KEY') {
             console.log("A primary key already exists. Attempting to drop existing and add new one.");
             try {
                // This is risky, assumes we want to replace the PK
                await connection.query("ALTER TABLE `invoices` DROP PRIMARY KEY");
                await connection.query("ALTER TABLE `invoices` ADD COLUMN `id` INT AUTO_INCREMENT PRIMARY KEY FIRST");
                console.log("Successfully replaced primary key with `id`.");
             } catch (pkError) {
                console.error("Failed to replace primary key:", pkError);
             }
        } else {
            throw error;
        }
    }

    // Add invoiceNumber column
    try {
      await connection.query("ALTER TABLE `invoices` ADD COLUMN `invoiceNumber` VARCHAR(255) NULL DEFAULT NULL AFTER `id`");
      console.log('Successfully added `invoiceNumber` column.');
    } catch (error) {
       if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('`invoiceNumber` column already exists. Skipping.');
      } else {
        throw error;
      }
    }
    
    // Make invoiceNumber unique
    try {
        await connection.query("ALTER TABLE `invoices` ADD UNIQUE KEY `unique_invoiceNumber` (`invoiceNumber`)");
        console.log("Successfully added UNIQUE constraint to `invoiceNumber`.");
    } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
            console.log("UNIQUE constraint on `invoiceNumber` already exists.");
        } else {
            throw error;
        }
    }


    // Modify fileName to allow NULL
    try {
        await connection.query("ALTER TABLE `invoices` MODIFY COLUMN `fileName` VARCHAR(255) NULL DEFAULT NULL");
        console.log('Successfully modified `fileName` to allow NULLs.');
    } catch (error) {
        console.error("Could not modify `fileName` column:", error.message);
    }
    
    // Add notes column
    try {
      await connection.query(
        "ALTER TABLE `invoices` ADD COLUMN `notes` TEXT NULL DEFAULT NULL"
      );
      console.log('Successfully added `notes` column.');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('`notes` column already exists. Skipping.');
      } else {
        throw error;
      }
    }

    console.log('Database schema update for invoices completed successfully!');

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

    