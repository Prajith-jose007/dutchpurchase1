
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

const branches = [
  { id: 'branch-6', name: 'PLAZA' },
  { id: 'branch-7', name: 'JBR' },
  { id: 'branch-8', name: 'WORLD TRADE CENTER' },
  { id: 'branch-9', name: 'PRODUCTION CITY' },
  { id: 'branch-10', name: 'ABU DHABI' },
  { id: 'branch-11', name: 'LOTUS ROYALE' },
  { id: 'branch-12', name: 'CENTRAL KITCHEN' },
  { id: 'branch-all', name: 'All Branches' },
];

async function migrateInitialData() {
  console.log('Starting data migration for users and branches...');
  
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

    // Migrate Branches
    console.log('Migrating branches...');
    await connection.beginTransaction();
    for (const branch of branches) {
      await connection.query('INSERT IGNORE INTO branches (id, name) VALUES (?, ?)', [branch.id, branch.name]);
    }
    await connection.commit();
    console.log('Branches migrated successfully!');

    // Migrate Users
    console.log('Migrating users with plain text passwords...');
    await connection.beginTransaction();
    
    for (const user of initialUsers) {
      // For this script, we'll use a simple default password 'password123'
      const password = 'password123'; 
      const { branchId, ...userData } = user;
      
      const [existing] = await connection.query('SELECT id FROM users WHERE id = ? OR username = ?', [userData.id, userData.username]);
      
      if (existing.length > 0) {
        // User exists, so update their password to the plain text version.
        await connection.query('UPDATE users SET password = ?, role = ? WHERE id = ?', [password, userData.role, existing[0].id]);
        console.log(`Updated password and role for existing user ${userData.username}.`);
      } else {
        // User does not exist, insert them with the plain text password.
        await connection.query(
          'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
          [userData.id, userData.username, password, userData.name, userData.role]
        );
        console.log(`User ${userData.username} inserted successfully.`);
      }

      // Handle the branch assignment. Use INSERT IGNORE to prevent errors if the link already exists.
      try {
        await connection.query('INSERT IGNORE INTO user_branches (userId, branchId) VALUES (?, ?)', [user.id, branchId]);
        console.log(`Linked user ${userData.username} to branch ${branchId}.`);
      } catch (e) {
        console.warn(`Could not link user ${userData.username} to branch ${branchId}. This might be expected if run multiple times.`);
      }
    }

    await connection.commit();
    console.log('User migration completed successfully!');
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error during data migration:', error);
  } finally {
    if (connection) {
      await connection.end(); // End the connection to allow the script to exit
    }
  }
}

migrateInitialData();
