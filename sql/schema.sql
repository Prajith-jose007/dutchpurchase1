
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL
);

CREATE TABLE IF NOT EXISTS user_branches (
    userId VARCHAR(255),
    branchId VARCHAR(255),
    PRIMARY KEY (userId, branchId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS items (
    code VARCHAR(255) PRIMARY KEY,
    remark VARCHAR(255),
    itemType VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    detailedDescription TEXT,
    units VARCHAR(50) NOT NULL,
    packing DECIMAL(10, 2) NOT NULL,
    shelfLifeDays INT,
    price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(255) PRIMARY KEY,
    branchId VARCHAR(255) NOT NULL,
    userId VARCHAR(255) NOT NULL,
    createdAt DATETIME NOT NULL,
    status VARCHAR(50) NOT NULL,
    totalItems INT NOT NULL,
    totalPrice DECIMAL(10, 2) NOT NULL,
    receivedByUserId VARCHAR(255),
    receivedAt DATETIME,
    invoiceNumber VARCHAR(255),
    invoiceNotes TEXT,
    FOREIGN KEY (branchId) REFERENCES branches(id),
    FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId VARCHAR(255) NOT NULL,
    itemId VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    units VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (itemId) REFERENCES items(code)
);

CREATE TABLE IF NOT EXISTS invoices (
    fileName VARCHAR(255) PRIMARY KEY,
    uploaderId VARCHAR(255) NOT NULL,
    uploadedAt DATETIME NOT NULL,
    notes TEXT,
    FOREIGN KEY (uploaderId) REFERENCES users(id)
);

-- Adding some basic indexes for performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_createdAt ON orders(createdAt);
CREATE INDEX idx_order_items_orderId ON order_items(orderId);
CREATE INDEX idx_items_description ON items(description(255));
