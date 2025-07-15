-- This script initializes the database schema for the Restaurant Supply Hub application.
-- Execute this script in your MySQL database before running the application for the first time
-- or running the data migration script.

-- Create the 'users' table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    branchId VARCHAR(255),
    role ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the 'orders' table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(255) PRIMARY KEY,
    branchId VARCHAR(255),
    userId VARCHAR(255),
    createdAt DATETIME NOT NULL,
    status VARCHAR(50) NOT NULL,
    totalItems INT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- Create the 'order_items' table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId VARCHAR(255) NOT NULL,
    itemId VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    units VARCHAR(50) NOT NULL,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
);

-- Create the 'invoices' table
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fileName VARCHAR(255) NOT NULL UNIQUE,
    uploaderId VARCHAR(255),
    orderId VARCHAR(255) NULL,
    uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaderId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL
);

-- Example of how to add an index for performance, which is good practice
CREATE INDEX idx_orders_userId ON orders(userId);
CREATE INDEX idx_orders_branchId ON orders(branchId);
CREATE INDEX idx_order_items_orderId ON order_items(orderId);
CREATE INDEX idx_invoices_orderId ON invoices(orderId);
