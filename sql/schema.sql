
-- Main schema for the Restaurant Supply Hub application

-- Users table to store user credentials and roles
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(128) NOT NULL,
  `username` VARCHAR(128) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL,
  PRIMARY KEY (`id`)
);

-- Branches are static, but this table links users to one or more branches
CREATE TABLE IF NOT EXISTS `user_branches` (
  `userId` VARCHAR(128) NOT NULL,
  `branchId` VARCHAR(128) NOT NULL,
  PRIMARY KEY (`userId`, `branchId`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Orders table to store purchase order headers
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(128) NOT NULL,
  `branchId` VARCHAR(128) NOT NULL,
  `userId` VARCHAR(128) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `status` ENUM('Pending', 'Order Received', 'Arrived', 'Closed', 'Cancelled', 'Approved', 'Processing', 'Shipped', 'Delivered') NOT NULL,
  `totalItems` INT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT
);

-- Order items table for details of each order
CREATE TABLE IF NOT EXISTS `order_items` (
  `orderId` VARCHAR(128) NOT NULL,
  `itemId` VARCHAR(128) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `units` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`orderId`, `itemId`),
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);

-- Invoices table to track uploaded invoice files
CREATE TABLE IF NOT EXISTS `invoices` (
  `fileName` VARCHAR(255) NOT NULL,
  `uploaderId` VARCHAR(128) NOT NULL,
  `orderId` VARCHAR(128),
  `uploadedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`fileName`),
  FOREIGN KEY (`uploaderId`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL
);
