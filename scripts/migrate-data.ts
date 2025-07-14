
// Use require for CommonJS compatibility with ts-node
const pool = require('../src/lib/db').default;
const { config } = require('dotenv');
import type { User } from '../src/lib/types';

// Load environment variables from .env file
config();

// The initial set of users that used to be in the appRepository
const initialUsers: Omit<User, 'password'>[] = [
  { id: 'user-admin', name: 'Admin User', username: 'admin', branchId: 'branch-all', role: 'admin' },
  { id: 'user-super', name: 'Super Admin', username: 'superadmin', branchId: 'branch-all', role: 'superadmin' },
  { id: 'user-purchase', name: 'Purchase Dept', username: 'purchase', branchId: 'branch-all', role: 'purchase' },
  { id: 'user-jbr-emp', name: 'JBR Employee', username: 'jbr_employee', branchId: 'branch-7', role: 'employee' },
  { id: 'user-plaza-emp', name: 'Plaza Employee', username: 'plaza_employee', branchId: 'branch-6', role: 'employee' },
];

async function migrateUsers() {
  console.log('Starting user migration...');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    
    for (const user of initialUsers) {
      // For this script, we'll use a simple default password 'password123'
      // In a real application, passwords should be securely hashed.
      const password = 'password123'; 
      
      const [existing] = await connection.query('SELECT id FROM users WHERE id = ? OR username = ?', [user.id, user.username]);
      
      if ((existing as any[]).length > 0) {
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
    await connection.rollback();
    console.error('Error during user migration:', error);
  } finally {
    connection.release();
    pool.end(); // End the pool to allow the script to exit
  }
}

migrateUsers();
