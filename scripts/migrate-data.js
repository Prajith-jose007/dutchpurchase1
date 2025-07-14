
// Use require for CommonJS compatibility with node
require('dotenv').config();
const mysql = require('mysql2/promise');

// The initial set of users that used to be in the appRepository
const initialUsers = [
  { id: 'user-admin', name: 'Admin User', username: 'admin', branchId: 'branch-all', role: 'admin' },
  { id: 'user-super', name: 'Super Admin', username: 'superadmin', branchId: 'branch-all', role: 'superadmin' },
  { id: 'user-purchase', name: 'Purchase Dept', username: 'purchase', branchId: 'branch-all', role: 'purchase' },
  { id: 'user-jbr-emp', name: 'JBR Employee', username: 'jbr_employee', branchId: 'branch-7', role: 'employee' },
  { id: 'user-plaza-emp', name: 'Plaza Employee', username: 'plaza_employee', branchId: 'branch-6', role: 'employee' },
];

async function migrateUsers() {
  console.log('Starting user migration...');
  
  let connection;
  try {
    // Create a new connection for the script
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    await connection.beginTransaction();
    
    for (const user of initialUsers) {
      // For this script, we'll use a simple default password 'password123'
      // In a real application, passwords should be securely hashed.
      const password = 'password123'; 
      
      const [existing] = await connection.query('SELECT id FROM users WHERE id = ? OR username = ?', [user.id, user.username]);
      
      if (existing.length > 0) {
        console.log(`User ${user.username} already exists, skipping.`);
      } else {
        await connection.query(
          'INSERT INTO users (id, username, password, name, branchId, role) VALUES (?, ?, ?, ?, ?, ?)',
          [user.id, user.username, password, user.name, user.branchId, user.role]
        );
        console.log(`User ${user.username} inserted successfully.`);
      }
    }

    await connection.commit();
    console.log('User migration completed successfully!');
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error during user migration:', error);
  } finally {
    if (connection) {
      await connection.end(); // End the connection to allow the script to exit
    }
  }
}

migrateUsers();
