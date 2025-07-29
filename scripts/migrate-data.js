
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
    console.log('Migrating users intelligently...');
    await connection.beginTransaction();
    
    for (const user of initialUsers) {
      const password = 'password123'; // Default password for any new users
      const { branchId, ...userData } = user;
      
      const [existing] = await connection.query('SELECT id FROM users WHERE username = ?', [userData.username]);
      
      if (existing.length > 0) {
        // User exists, so we skip them to preserve their current data.
        console.log(`User '${userData.username}' already exists. Skipping.`);
      } else {
        // User does not exist, insert them with the default password.
        console.log(`User '${userData.username}' not found. Inserting...`);
        await connection.query(
          'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
          [userData.id, userData.username, password, userData.name, userData.role]
        );
        console.log(`... Inserted user ${userData.username}.`);
      }

      // Handle the branch assignment. Use INSERT IGNORE to prevent errors if the link already exists.
      // This is safe to run even if the user already existed.
      await connection.query('INSERT IGNORE INTO user_branches (userId, branchId) VALUES (?, ?)', [user.id, branchId]);
    }

    await connection.commit();
    console.log('User migration check completed successfully!');
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
