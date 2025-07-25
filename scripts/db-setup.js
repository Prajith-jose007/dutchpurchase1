
// scripts/db-setup.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');

async function setupDatabase() {
  console.log('Starting database setup...');
  let connection;

  try {
    // Connect without specifying a database first to ensure it exists
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    const dbName = process.env.DB_DATABASE;
    console.log(`Ensuring database '${dbName}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database '${dbName}' is ready.`);
    await connection.end(); // Close initial connection

    // Reconnect, this time to the specific database to run the schema
    connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        multipleStatements: true // Allow multiple SQL queries in one execution
    });
    
    // Drop tables in the correct order to respect foreign key constraints
    console.log('Dropping existing tables to apply new schema...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('DROP TABLE IF EXISTS `invoices`;');
    await connection.query('DROP TABLE IF EXISTS `order_items`;');
    await connection.query('DROP TABLE IF EXISTS `orders`;');
    await connection.query('DROP TABLE IF EXISTS `items`;');
    await connection.query('DROP TABLE IF EXISTS `user_branches`;');
    await connection.query('DROP TABLE IF EXISTS `branches`;');
    await connection.query('DROP TABLE IF EXISTS `users`;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('Existing tables dropped.');

    console.log('Reading schema.sql file...');
    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf-8');
    
    if (!schemaSQL) {
        throw new Error('schema.sql is empty or could not be read.');
    }

    console.log('Executing schema.sql to create tables...');
    await connection.query(schemaSQL);
    console.log('Tables created successfully!');

    console.log('Database setup completed!');

  } catch (error) {
    console.error('Error during database setup:', error);
    process.exit(1); // Exit with an error code
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
