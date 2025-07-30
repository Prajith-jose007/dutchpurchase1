
-- SQL Schema for Restaurant Supply Hub

-- Users table to store login and role information
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Branches table to store location information
CREATE TABLE IF NOT EXISTS `branches` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Junction table to link users to one or more branches
CREATE TABLE IF NOT EXISTS `user_branches` (
  `userId` VARCHAR(100) NOT NULL,
  `branchId` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`userId`, `branchId`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Items table for the master inventory list
CREATE TABLE IF NOT EXISTS `items` (
  `code` VARCHAR(191) NOT NULL PRIMARY KEY,
  `remark` VARCHAR(255) NULL,
  `itemType` VARCHAR(255) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `detailedDescription` TEXT NULL,
  `units` VARCHAR(50) NOT NULL,
  `packing` DECIMAL(10, 2) NOT NULL,
  `shelfLifeDays` INT NULL,
  `price` DECIMAL(10, 2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders table to store header information for each purchase order
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `branchId` VARCHAR(100) NOT NULL,
  `userId` VARCHAR(100) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `status` ENUM('Pending', 'Order Received', 'Arrived', 'Closed', 'Cancelled', 'Approved', 'Processing', 'Shipped', 'Delivered') NOT NULL,
  `totalItems` INT NOT NULL,
  `totalPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `receivedByUserId` VARCHAR(255) NULL DEFAULT NULL,
  `receivedAt` DATETIME NULL DEFAULT NULL,
  KEY `userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order items table to store individual line items for each order
CREATE TABLE IF NOT EXISTS `order_items` (
  `orderId` VARCHAR(100) NOT NULL,
  `itemId` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(10, 3) NOT NULL,
  `units` VARCHAR(50) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`orderId`, `itemId`),
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Invoices table to store filenames of uploaded invoice documents
CREATE TABLE IF NOT EXISTS `invoices` (
  `fileName` VARCHAR(100) NOT NULL PRIMARY KEY,
  `uploaderId` VARCHAR(100) NOT NULL,
  `orderId` VARCHAR(100) NULL,
  `uploadedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `uploaderId_idx` (`uploaderId`),
  KEY `orderId_idx` (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add foreign key constraint for orders to branches
ALTER TABLE `orders`
ADD CONSTRAINT `fk_orders_branchId`
FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`)
ON DELETE RESTRICT;
