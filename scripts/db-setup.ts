
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
require('dotenv').config();

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
