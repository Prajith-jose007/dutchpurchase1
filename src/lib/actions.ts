
"use server";

import type { CartItem, Order, OrderItem, User, Invoice, OrderStatus } from "@/lib/types";
import pool from '@/lib/db';
import type { RowDataPacket, OkPacket } from 'mysql2';

// Helper to get all users, now from the database
async function getAllUsersFromDB(): Promise<User[]> {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id, username, name, branchId, role FROM users");
    return rows as User[];
}

export async function submitOrderAction(cartItems: CartItem[], branchId: string, userId: string): Promise<{ success: boolean; orderId?: string; error?: string }> {
  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: "Cart is empty." };
  }
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const orderId = `order-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newOrder: Omit<Order, 'items' | 'invoiceFileNames'> = {
      id: orderId,
      branchId,
      userId,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: "Pending",
      totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    };

    await connection.query("INSERT INTO orders (id, branchId, userId, createdAt, status, totalItems) VALUES (?, ?, ?, ?, ?, ?)", 
      [newOrder.id, newOrder.branchId, newOrder.userId, newOrder.createdAt, newOrder.status, newOrder.totalItems]
    );

    const orderItemsValues = cartItems.map(item => [orderId, item.code, item.description, item.quantity, item.units]);
    await connection.query("INSERT INTO order_items (orderId, itemId, description, quantity, units) VALUES ?", [orderItemsValues]);

    await connection.commit();
    return { success: true, orderId: orderId };
  } catch (error) {
    await connection.rollback();
    console.error("Failed to submit order:", error);
    return { success: false, error: "Database error: Failed to submit order." };
  } finally {
    connection.release();
  }
}

export async function getOrdersAction(user: User | null): Promise<Order[]> {
    if (!user) return [];

    let query = `
        SELECT o.id, o.branchId, o.userId, o.createdAt, o.status, o.totalItems,
               oi.itemId, oi.description, oi.quantity, oi.units,
               inv.fileName as invoiceFileName
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.orderId
        LEFT JOIN invoices inv ON o.id = inv.orderId
    `;
    const params: (string | number)[] = [];

    if (user.role === 'employee') {
        query += " WHERE o.userId = ?";
        params.push(user.id);
    }

    query += " ORDER BY o.createdAt DESC";

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    const ordersMap: { [key: string]: Order } = {};
    rows.forEach(row => {
        if (!ordersMap[row.id]) {
            ordersMap[row.id] = {
                id: row.id,
                branchId: row.branchId,
                userId: row.userId,
                createdAt: new Date(row.createdAt).toISOString(),
                status: row.status,
                totalItems: row.totalItems,
                items: [],
                invoiceFileNames: [],
            };
        }
        if (row.itemId) {
            ordersMap[row.id].items.push({
                itemId: row.itemId,
                description: row.description,
                quantity: row.quantity,
                units: row.units,
            });
        }
         if (row.invoiceFileName && !ordersMap[row.id].invoiceFileNames?.includes(row.invoiceFileName)) {
            ordersMap[row.id].invoiceFileNames?.push(row.invoiceFileName);
        }
    });

    return Object.values(ordersMap);
}


export async function getOrderByIdAction(orderId: string): Promise<Order | undefined> {
    const [orderRows] = await pool.query<RowDataPacket[]>("SELECT * FROM orders WHERE id = ?", [orderId]);
    if (orderRows.length === 0) return undefined;

    const orderData = orderRows[0];
    const [itemRows] = await pool.query<RowDataPacket[]>("SELECT * FROM order_items WHERE orderId = ?", [orderId]);
    const [invoiceRows] = await pool.query<RowDataPacket[]>("SELECT fileName FROM invoices WHERE orderId = ?", [orderId]);

    const order: Order = {
        id: orderData.id,
        branchId: orderData.branchId,
        userId: orderData.userId,
        createdAt: new Date(orderData.createdAt).toISOString(),
        status: orderData.status,
        totalItems: orderData.totalItems,
        items: itemRows as OrderItem[],
        invoiceFileNames: invoiceRows.map(r => r.fileName)
    };
    return order;
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus): Promise<{ success: boolean; error?: string }> {
    try {
        await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
        return { success: true };
    } catch (error) {
        console.error("Failed to update order status:", error);
        return { success: false, error: "Database error: Failed to update status." };
    }
}


export async function getUser(userId: string): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id, username, name, branchId, role FROM users WHERE id = ?", [userId]);
    return (rows[0] as User) || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM users WHERE username = ?", [username]);
    return (rows[0] as User) || null;
}

export async function getUsersAction(): Promise<User[]> {
    return getAllUsersFromDB();
}

export async function addUserAction(userData: Omit<User, 'id'>): Promise<{ success: boolean; error?: string }> {
    if (!userData.username || !userData.password || !userData.name || !userData.branchId || !userData.role) {
        return { success: false, error: "All fields are required." };
    }
    
    const existingUser = await getUserByUsername(userData.username);
    if (existingUser) {
        return { success: false, error: "Username already exists. Please choose another." };
    }

    const newUser: User = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ...userData,
    };

    try {
        await pool.query("INSERT INTO users (id, username, password, name, branchId, role) VALUES (?, ?, ?, ?, ?, ?)", 
          [newUser.id, newUser.username, newUser.password, newUser.name, newUser.branchId, newUser.role]
        );
        return { success: true };
    } catch (error) {
        console.error("Error adding user:", error);
        return { success: false, error: "Database error occurred while adding user." };
    }
}

export async function updateUserAction(userId: string, userData: Partial<Pick<User, 'name' | 'branchId' | 'role' | 'password'>>): Promise<{ success: boolean, error?: string }> {
    const { name, branchId, role, password } = userData;
    if (!name || !branchId || !role) {
        return { success: false, error: 'Name, branch, and role are required.' };
    }
    try {
        if (password && password.length >= 6) {
            // If a new password is provided, update it
            await pool.query(
                "UPDATE users SET name = ?, branchId = ?, role = ?, password = ? WHERE id = ?", 
                [name, branchId, role, password, userId]
            );
        } else {
            // Otherwise, update everything except the password
            await pool.query(
                "UPDATE users SET name = ?, branchId = ?, role = ? WHERE id = ?",
                [name, branchId, role, userId]
            );
        }
        return { success: true };
    } catch (error) {
        console.error('Failed to update user:', error);
        return { success: false, error: 'Database error occurred while updating user.' };
    }
}


export async function deleteUserAction(userId: string): Promise<{ success: boolean, error?: string }> {
    try {
        // You might want to add a check here to prevent a user from deleting themselves
        const [result] = await pool.query<OkPacket>("DELETE FROM users WHERE id = ?", [userId]);
        if (result.affectedRows > 0) {
            return { success: true };
        } else {
            return { success: false, error: 'User not found or could not be deleted.' };
        }
    } catch (error) {
        console.error('Failed to delete user:', error);
        return { success: false, error: 'Database error occurred while deleting user.' };
    }
}


export async function uploadInvoicesAction(formData: FormData): Promise<{ success: boolean; fileCount?: number; error?: string }> {
  try {
    const files = formData.getAll('invoices') as File[];
    const userId = formData.get('userId') as string;

    if (!files || files.length === 0) return { success: false, error: 'No files were uploaded.' };
    if (!userId) return { success: false, error: 'User is not authenticated.' };

    const invoiceValues = files.map(file => [file.name, userId]);
    
    // Using INSERT IGNORE to prevent errors on duplicate filenames.
    // In a real app, you'd handle file storage and generate unique names first.
    await pool.query("INSERT IGNORE INTO invoices (fileName, uploaderId) VALUES ?", [invoiceValues]);
    
    return { success: true, fileCount: files.length };
  } catch (error) {
    console.error('Invoice upload failed:', error);
    return { success: false, error: 'A database error occurred during invoice upload.' };
  }
}

export async function getRecentUploadsAction(): Promise<string[]> {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT fileName FROM invoices WHERE orderId IS NULL ORDER BY uploadedAt DESC");
    return rows.map(r => r.fileName);
}

export async function attachInvoicesToOrderAction(orderId: string, invoiceFileNames: string[]): Promise<{ success: boolean; error?: string }> {
    if (invoiceFileNames.length === 0) return { success: true }; // Nothing to do
    try {
        const placeholders = invoiceFileNames.map(() => '?').join(',');
        await pool.query(`UPDATE invoices SET orderId = ? WHERE fileName IN (${placeholders})`, [orderId, ...invoiceFileNames]);
        return { success: true };
    } catch (error) {
        console.error('Attaching invoices failed:', error);
        return { success: false, error: 'A database error occurred while attaching invoices.' };
    }
}

export async function getInvoicesAction(): Promise<Invoice[]> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT fileName, orderId FROM invoices ORDER BY uploadedAt DESC");
  return rows.map(r => ({
      fileName: r.fileName,
      orderId: r.orderId || null,
  }));
}
