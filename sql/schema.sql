
-- SQL Schema for the Restaurant Supply Management App

-- Users Table: Stores login credentials and roles for all users.
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL
);

-- Branches Table: Stores the different restaurant locations.
CREATE TABLE IF NOT EXISTS `branches` (
  `id` VARCHAR(191) PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL UNIQUE
);


-- User_Branches Table: Links users to the branches they have access to.
-- A user can be associated with multiple branches.
CREATE TABLE IF NOT EXISTS `user_branches` (
  `userId` VARCHAR(100) NOT NULL,
  `branchId` VARCHAR(100) NOT NULL,
  PRIMARY KEY (userId, branchId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE CASCADE
);

-- Items Table: The master list of all inventory items available for ordering.
CREATE TABLE IF NOT EXISTS `items` (
  `code` VARCHAR(191) NOT NULL PRIMARY KEY,
  `remark` VARCHAR(255),
  `itemType` VARCHAR(255) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `detailedDescription` TEXT,
  `units` VARCHAR(50) NOT NULL,
  `packing` DECIMAL(10, 2) NOT NULL,
  `shelfLifeDays` INT,
  `price` DECIMAL(10, 2) NOT NULL
);

-- Orders Table: Header information for each purchase order.
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(100) PRIMARY KEY,
  `branchId` VARCHAR(100) NOT NULL,
  `userId` VARCHAR(100) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `status` ENUM('Pending', 'Order Received', 'Arrived', 'Closed', 'Cancelled', 'Approved', 'Processing', 'Shipped', 'Delivered') NOT NULL,
  `totalItems` INT NOT NULL,
  `totalPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `receivedByUserId` VARCHAR(255),
  `receivedAt` DATETIME,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (receivedByUserId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE CASCADE
);

-- Order_Items Table: Line items for each order, detailing the products and quantities.
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orderId` VARCHAR(100) NOT NULL,
  `itemId` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(10, 3) NOT NULL, -- Changed from INT to DECIMAL
  `units` VARCHAR(50) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (itemId) REFERENCES items(code) ON DELETE CASCADE
);

-- Invoices Table: Stores information about uploaded invoice files.
CREATE TABLE IF NOT EXISTS `invoices` (
  `fileName` VARCHAR(100) NOT NULL PRIMARY KEY,
  `uploaderId` VARCHAR(100) NOT NULL,
  `orderId` VARCHAR(100),
  `uploadedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaderId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL
);

