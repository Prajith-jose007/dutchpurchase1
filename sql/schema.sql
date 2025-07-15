-- sql/schema.sql

-- Users table to store login and user information
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NULL,
  `name` VARCHAR(255) NOT NULL,
  `branchId` VARCHAR(255) NOT NULL,
  `role` ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL,
  PRIMARY KEY (`id`)
);

-- Orders table to store high-level order information
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(255) NOT NULL,
  `branchId` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `status` ENUM('Pending', 'Order Received', 'Arrived', 'Closed', 'Cancelled', 'Approved', 'Processing', 'Shipped', 'Delivered') NOT NULL,
  `totalItems` INT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Order items table to store individual items for each order
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `orderId` VARCHAR(255) NOT NULL,
  `itemId` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `units` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);

-- Invoices table to track uploaded invoice files
CREATE TABLE IF NOT EXISTS `invoices` (
  `fileName` VARCHAR(255) NOT NULL,
  `uploaderId` VARCHAR(255) NOT NULL,
  `uploadedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `orderId` VARCHAR(255) NULL,
  PRIMARY KEY (`fileName`),
  FOREIGN KEY (`uploaderId`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL
);
