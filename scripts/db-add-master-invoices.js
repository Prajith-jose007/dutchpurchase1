
// scripts/db-add-master-invoices.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupMasterInvoices() {
  console.log('Starting master invoice table setup...');
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

    // Create master_invoices table
    console.log('Creating `master_invoices` table if it does not exist...');
    // The VARCHAR(191) on the key is a fix for "Specified key was too long" error on some MySQL setups.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS master_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoiceNumber VARCHAR(255) NOT NULL,
        fileName VARCHAR(255) NULL,
        notes TEXT NULL,
        createdAt DATETIME NOT NULL,
        uploaderId VARCHAR(255) NULL,
        UNIQUE KEY unique_invoiceNumber (invoiceNumber(191))
      )
    `);
    console.log('`master_invoices` table created or already exists.');
    
    // Create order_master_invoice_links table
    console.log('Creating `order_master_invoice_links` table if it does not exist...');
    // The VARCHAR(191) on the orderId part of the key is a fix for "Specified key was too long" error.
    await connection.query(`
        CREATE TABLE IF NOT EXISTS order_master_invoice_links (
            orderId VARCHAR(255) NOT NULL,
            masterInvoiceId INT NOT NULL,
            PRIMARY KEY (orderId(191), masterInvoiceId),
            FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (masterInvoiceId) REFERENCES master_invoices(id) ON DELETE CASCADE
        )
    `);
    console.log('`order_master_invoice_links` table created or already exists.');

    console.log('Database schema setup for master invoices completed successfully!');

  } catch (error) {
    console.error('Error during master invoice setup:', error);
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

setupMasterInvoices();
