
-- Main schema for the Restaurant Supply Hub application
-- Defines tables for users, branches, orders, items, and invoices.
-- Key lengths are set to VARCHAR(128) to avoid "key was too long" errors on some MySQL setups.

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(128) NOT NULL,
  `username` VARCHAR(128) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `user_branches` (
  `userId` VARCHAR(128) NOT NULL,
  `branchId` VARCHAR(128) NOT NULL,
  PRIMARY KEY (`userId`, `branchId`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS `order_items` (
  `orderId` VARCHAR(128) NOT NULL,
  `itemId` VARCHAR(128) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `units` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`orderId`, `itemId`),
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `invoices` (
  `fileName` VARCHAR(128) NOT NULL,
  `uploaderId` VARCHAR(128) NOT NULL,
  `orderId` VARCHAR(128),
  `uploadedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`fileName`),
  FOREIGN KEY (`uploaderId`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL
);
