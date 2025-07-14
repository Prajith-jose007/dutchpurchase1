-- This file contains the SQL schema for creating the necessary tables
-- in your MySQL database for the Restaurant Supply Hub application.

-- Before running this script, make sure you have:
-- 1. A running MySQL server.
-- 2. Created a database (e.g., `CREATE DATABASE restaurant_supplies;`).
-- 3. Configured your .env file with the correct credentials.
--
-- You can run this script using a tool like MySQL Workbench, DBeaver,
-- or the mysql command-line interface:
-- `mysql -u your_username -p your_database_name < schema.sql`


-- Table for storing user information and credentials
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `branchId` VARCHAR(255) NOT NULL,
  `role` ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL,
  PRIMARY KEY (`id`)
);

-- Table for storing order headers
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(255) NOT NULL,
  `branchId` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Processing', 'Shipped', 'Delivered', 'Cancelled') NOT NULL,
  `totalItems` INT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
);

-- Table for storing individual items within an order
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orderId` VARCHAR(255) NOT NULL,
  `itemId` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `units` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);

-- Table for storing uploaded invoice information
CREATE TABLE IF NOT EXISTS `invoices` (
  `fileName` VARCHAR(255) NOT NULL,
  `uploaderId` VARCHAR(255) NOT NULL,
  `orderId` VARCHAR(255) NULL,
  `uploadedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`fileName`),
  FOREIGN KEY (`uploaderId`) REFERENCES `users`(`id`),
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL
);


-- Seed the database with a default admin user
-- IMPORTANT: Change the password in a real application!
INSERT IGNORE INTO `users` (id, username, password, name, branchId, role) VALUES
('user-super-001', 'superadmin', 'superadmin123', 'Super Admin', 'branch-all', 'superadmin'),
('user-admin-001', 'admin', 'admin123', 'Default Admin', 'branch-all', 'admin'),
('user-purchase-001', 'purchase', 'purchase123', 'Purchase Manager', 'branch-all', 'purchase'),
('user-employee-001', 'employee', 'employee123', 'John Doe', 'branch-6', 'employee');
