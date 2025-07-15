-- Main table for users
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255),
  `name` VARCHAR(255) NOT NULL,
  `role` ENUM('superadmin', 'admin', 'purchase', 'employee') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `username_UNIQUE` (`username` ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Junction table for user-to-branch relationship
CREATE TABLE IF NOT EXISTS `user_branches` (
  `userId` VARCHAR(255) NOT NULL,
  `branchId` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`userId`, `branchId`),
  INDEX `fk_user_branches_users_idx` (`userId` ASC),
  CONSTRAINT `fk_user_branches_users`
    FOREIGN KEY (`userId`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table for purchase orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(255) NOT NULL,
  `branchId` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `status` ENUM('Pending', 'Order Received', 'Arrived', 'Closed', 'Cancelled', 'Approved', 'Processing', 'Shipped', 'Delivered') NOT NULL,
  `totalItems` INT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_orders_users_idx` (`userId` ASC),
  CONSTRAINT `fk_orders_users`
    FOREIGN KEY (`userId`)
    REFERENCES `users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table for items within an order
CREATE TABLE IF NOT EXISTS `order_items` (
  `orderId` VARCHAR(255) NOT NULL,
  `itemId` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `units` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`orderId`, `itemId`),
  INDEX `fk_order_items_orders_idx` (`orderId` ASC),
  CONSTRAINT `fk_order_items_orders`
    FOREIGN KEY (`orderId`)
    REFERENCES `orders` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table for uploaded invoices
CREATE TABLE IF NOT EXISTS `invoices` (
  `fileName` VARCHAR(255) NOT NULL,
  `orderId` VARCHAR(255) NULL,
  `uploaderId` VARCHAR(255) NOT NULL,
  `uploadedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`fileName`),
  INDEX `fk_invoices_orders_idx` (`orderId` ASC),
  INDEX `fk_invoices_users_idx` (`uploaderId` ASC),
  CONSTRAINT `fk_invoices_orders`
    FOREIGN KEY (`orderId`)
    REFERENCES `orders` (`id`)
    ON DELETE SET NULL
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_invoices_users`
    FOREIGN KEY (`uploaderId`)
    REFERENCES `users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
