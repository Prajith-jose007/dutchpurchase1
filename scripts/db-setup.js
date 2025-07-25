
// scripts/db-setup.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');

async function setupDatabase() {
  console.log('Starting intelligent database setup...');
  let connection;

  try {
    const dbName = process.env.DB_DATABASE;
    if (!dbName) {
      throw new Error("DB_DATABASE environment variable is not set.");
    }

    // Connect to MySQL server without specifying a database to check for existence
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log(`Checking for database '${dbName}'...`);
    const [rows] = await connection.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbName]
    );

    if (rows.length > 0) {
      console.log(`Database '${dbName}' already exists. No action needed.`);
      await connection.end();
      return; // Exit gracefully
    }

    // --- If database does NOT exist, proceed with creation ---
    console.log(`Database '${dbName}' not found. Creating...`);
    await connection.query(`CREATE DATABASE \`${dbName}\``);
    console.log(`Database '${dbName}' created successfully.`);
    await connection.end(); // Close initial connection

    // Reconnect, this time to the new database to run the schema
    connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        multipleStatements: true
    });
    
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
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
