
-- SQL Schema for the Supply Management Application

-- Make sure to create the database first:
-- CREATE DATABASE supply_management_db;
-- USE supply_management_db;

-- Users Table
-- Stores user credentials and information.
CREATE TABLE `users` (
  `id` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `branchId` varchar(255) NOT NULL,
  `role` enum('superadmin','admin','purchase','employee') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username_UNIQUE` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed initial users
INSERT INTO `users` VALUES 
('user-superadmin','superadmin','Pass989#','Super Admin','branch-all','superadmin'),
('user-admin','admin','Dutch@989#','Admin User','branch-all','admin'),
('user-purchase','purchase','Dutch@25','Purchase User','branch-all','purchase'),
('user-1','alice','password1','Alice Smith','branch-6','employee'),
('user-2','bob','password2','Bob Johnson','branch-7','employee'),
('user-store','Store','Dutch@25','Store User','branch-all','employee'),
('user-jbrstore','jbrstore','Pass@123#','JBR Store User','branch-7','employee'),
('user-plazastore','plazastore','Password','Plaza Store User','branch-6','employee');


-- Orders Table
-- Stores the main information for each purchase order.
CREATE TABLE `orders` (
  `id` varchar(255) NOT NULL,
  `branchId` varchar(255) NOT NULL,
  `userId` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `status` enum('Pending','Approved','Processing','Shipped','Delivered','Cancelled') NOT NULL,
  `totalItems` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId_idx` (`userId`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Order Items Table
-- Stores the individual items within each order.
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` varchar(255) NOT NULL,
  `itemId` varchar(255) NOT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `units` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `orderId` (`orderId`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Invoices Table
-- Stores information about uploaded invoices and their link to orders.
CREATE TABLE `invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fileName` varchar(255) NOT NULL,
  `orderId` varchar(255) DEFAULT NULL,
  `uploadedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `uploaderId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fileName_UNIQUE` (`fileName`),
  KEY `orderId` (`orderId`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`uploaderId`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Note: The inventory data remains static in `src/data/inventoryItems.ts`.
-- If this needed to be dynamic, an `inventory_items` table would also be required.
