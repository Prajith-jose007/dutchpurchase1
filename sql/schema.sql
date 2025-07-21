
-- SQL for setting up the database schema

-- Users table to store login and role information
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `username` VARCHAR(191) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL
);

-- Branches table (though primarily managed in-app, can be stored here for consistency)
CREATE TABLE IF NOT EXISTS `branches` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL UNIQUE
);

-- User-Branches link table for many-to-many relationship
CREATE TABLE IF NOT EXISTS `user_branches` (
  `userId` VARCHAR(191) NOT NULL,
  `branchId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`userId`, `branchId`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
  -- We don't link to branches.id as it's not populated in this schema
);

-- Orders table to store purchase order master details
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `branchId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
  `totalItems` INT NOT NULL DEFAULT 0,
  `totalPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `receivedByUserId` VARCHAR(191) NULL,
  `receivedAt` DATETIME NULL
);

-- Order Items table for line items in each order
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orderId` VARCHAR(191) NOT NULL,
  `itemId` VARCHAR(191) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `units` VARCHAR(50) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);

-- Invoices table to track uploaded invoice files
CREATE TABLE IF NOT EXISTS `invoices` (
  `fileName` VARCHAR(191) NOT NULL PRIMARY KEY,
  `uploaderId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NULL,
  `uploadedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS `items` (
  `code` VARCHAR(191) NOT NULL PRIMARY KEY,
  `remark` VARCHAR(255) NULL,
  `itemType` VARCHAR(255) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `units` VARCHAR(50) NOT NULL,
  `packing` DECIMAL(10, 2) NOT NULL,
  `shelfLifeDays` INT NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL
);
