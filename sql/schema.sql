
-- schema.sql

-- Users table to store login and user information
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(255) PRIMARY KEY,
  `username` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL, -- Note: Storing plain text, insecure for production
  `name` VARCHAR(255) NOT NULL,
  `role` ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL
);

-- Branches table for different store locations
CREATE TABLE IF NOT EXISTS `branches` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE
);

-- Linking table for many-to-many relationship between users and branches
CREATE TABLE IF NOT EXISTS `user_branches` (
  `userId` VARCHAR(255),
  `branchId` VARCHAR(255),
  PRIMARY KEY (`userId`, `branchId`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS `items` (
  `code` VARCHAR(255) PRIMARY KEY,
  `remark` VARCHAR(255),
  `itemType` VARCHAR(255) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `detailedDescription` TEXT,
  `units` VARCHAR(50) NOT NULL,
  `packing` DECIMAL(10, 2) NOT NULL,
  `shelfLifeDays` INT NOT NULL DEFAULT 0,
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

-- Orders table to store purchase order headers
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(255) PRIMARY KEY,
  `branchId` VARCHAR(255),
  `userId` VARCHAR(255),
  `createdAt` DATETIME NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `totalItems` INT NOT NULL,
  `totalPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `receivedByUserId` VARCHAR(255),
  `receivedAt` DATETIME,
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`),
  FOREIGN KEY (`receivedByUserId`) REFERENCES `users`(`id`)
);

-- Order items table for individual items in an order
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orderId` VARCHAR(255),
  `itemId` VARCHAR(255),
  `description` VARCHAR(255),
  `quantity` DECIMAL(10, 3) NOT NULL,
  `units` VARCHAR(50),
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`itemId`) REFERENCES `items`(`code`)
);

-- Invoices table to track uploaded invoice files
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `fileName` VARCHAR(255) NOT NULL UNIQUE,
  `uploadedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `uploaderId` VARCHAR(255),
  `orderId` VARCHAR(255) NULL,
  FOREIGN KEY (`uploaderId`) REFERENCES `users`(`id`),
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL
);

-- Add an index for faster lookups on orderId in order_items
CREATE INDEX idx_order_items_orderId ON order_items(orderId);
CREATE INDEX idx_invoices_orderId ON invoices(orderId);
CREATE INDEX idx_users_username ON users(username);

