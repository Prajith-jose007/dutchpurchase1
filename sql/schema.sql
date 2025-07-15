
-- sql/schema.sql

-- Users Table: Stores user credentials and roles
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL
);

-- Branches Table: Stores branch information (although we use a static list in the app, a table is good practice)
CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- User-Branches Junction Table: Links users to one or more branches (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_branches (
  userId VARCHAR(255) NOT NULL,
  branchId VARCHAR(255) NOT NULL,
  PRIMARY KEY (userId, branchId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Orders Table: Stores the main details of each purchase order
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(255) PRIMARY KEY,
  branchId VARCHAR(255) NOT NULL,
  userId VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL,
  status ENUM('Pending', 'Order Received', 'Arrived', 'Closed', 'Cancelled', 'Approved', 'Processing', 'Shipped', 'Delivered') NOT NULL,
  totalItems INT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Order Items Table: Stores the individual items within each order
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId VARCHAR(255) NOT NULL,
  itemId VARCHAR(255) NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  units VARCHAR(50) NOT NULL,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
);

-- Invoices Table: Stores information about uploaded invoices and links them to orders
CREATE TABLE IF NOT EXISTS invoices (
  fileName VARCHAR(255) PRIMARY KEY,
  uploaderId VARCHAR(255) NOT NULL,
  orderId VARCHAR(255) NULL,
  uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaderId) REFERENCES users(id),
  FOREIGN KEY (orderId) REFERENCES orders(id)
);

