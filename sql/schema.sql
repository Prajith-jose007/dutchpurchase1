
-- This schema is intended for a MySQL database.

-- Users table to store login information and roles
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username_UNIQUE` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Branches table to store the different restaurant locations
CREATE TABLE IF NOT EXISTS `branches` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_UNIQUE` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User-Branches link table for many-to-many relationship
CREATE TABLE IF NOT EXISTS `user_branches` (
  `userId` VARCHAR(255) NOT NULL,
  `branchId` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`userId`, `branchId`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Items table for inventory
CREATE TABLE IF NOT EXISTS `items` (
  `code` VARCHAR(255) NOT NULL,
  `remark` VARCHAR(255) NULL,
  `itemType` VARCHAR(255) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `detailedDescription` TEXT NULL,
  `units` VARCHAR(50) NOT NULL,
  `packing` DECIMAL(10, 2) NOT NULL,
  `shelfLifeDays` INT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(255) NOT NULL,
  `branchId` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `totalItems` INT NOT NULL,
  `totalPrice` DECIMAL(10, 2) NOT NULL,
  `receivedByUserId` VARCHAR(255) NULL,
  `receivedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  FOREIGN KEY (`receivedByUserId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Order items table
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orderId` VARCHAR(255) NOT NULL,
  `itemId` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(10, 3) NOT NULL,
  `units` VARCHAR(50) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`itemId`) REFERENCES `items` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoices table to store uploaded invoice filenames
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `fileName` VARCHAR(255) NOT NULL,
  `uploaderId` VARCHAR(255) NOT NULL,
  `orderId` VARCHAR(255) NULL, -- Can be null if it's a general invoice
  `notes` TEXT NULL, -- New field for purchase team notes
  `uploadedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `fileName_UNIQUE` (`fileName`), -- Prevent duplicate file names
  FOREIGN KEY (`uploaderId`) REFERENCES `users` (`id`),
  FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
