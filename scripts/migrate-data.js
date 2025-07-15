
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
  console.log('Starting user migration with multi-branch support...');
  
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
      const { branchId, ...userData } = user;
      
      const [existing] = await connection.query('SELECT id FROM users WHERE id = ? OR username = ?', [userData.id, userData.username]);
      
      if (existing.length > 0) {
        console.log(`User ${userData.username} already exists, skipping.`);
      } else {
        await connection.query(
          'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
          [userData.id, userData.username, password, userData.name, userData.role]
        );
        console.log(`User ${userData.username} inserted successfully.`);
      }

      // Now handle the branch assignment in the new junction table
      const [existingBranchLink] = await connection.query('SELECT * FROM user_branches WHERE userId = ? AND branchId = ?', [userData.id, branchId]);
      if (existingBranchLink.length > 0) {
          console.log(`Branch link for ${userData.username} to ${branchId} already exists.`);
      } else {
          await connection.query('INSERT INTO user_branches (userId, branchId) VALUES (?, ?)', [userData.id, branchId]);
          console.log(`Linked user ${userData.username} to branch ${branchId}.`);
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
