
"use server";

import type { CartItem, Order, OrderItem, User, Invoice, OrderStatus } from "@/lib/types";
import pool from '@/lib/db';
import type { RowDataPacket, OkPacket } from 'mysql2';

async function fetchUsersWithBranches(): Promise<User[]> {
    const query = `
        SELECT u.id, u.username, u.name, u.role, GROUP_CONCAT(ub.branchId) as branchIds
        FROM users u
        LEFT JOIN user_branches ub ON u.id = ub.userId
        GROUP BY u.id, u.username, u.name, u.role
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows.map(row => ({
        ...row,
        branchIds: row.branchIds ? row.branchIds.split(',') : [],
    })) as User[];
}


export async function submitOrderAction(cartItems: CartItem[], branchId: string, userId: string): Promise<{ success: boolean; orderId?: string; error?: string }> {
  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: "Cart is empty." };
  }
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const orderId = `order-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const newOrder: Omit<Order, 'items' | 'invoiceFileNames'> = {
      id: orderId,
      branchId,
      userId,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: "Pending",
      totalItems,
      totalPrice,
    };

    await connection.query("INSERT INTO orders (id, branchId, userId, createdAt, status, totalItems, totalPrice) VALUES (?, ?, ?, ?, ?, ?, ?)", 
      [newOrder.id, newOrder.branchId, newOrder.userId, newOrder.createdAt, newOrder.status, newOrder.totalItems, newOrder.totalPrice]
    );

    const orderItemsValues = cartItems.map(item => [orderId, item.code, item.description, item.quantity, item.units, item.price]);
    await connection.query("INSERT INTO order_items (orderId, itemId, description, quantity, units, price) VALUES ?", [orderItemsValues]);

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
        SELECT o.id, o.branchId, o.userId, o.createdAt, o.status, o.totalItems, o.totalPrice,
               oi.itemId, oi.description, oi.quantity, oi.units, oi.price as itemPrice,
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
                totalPrice: row.totalPrice,
                items: [],
                invoiceFileNames: [],
            };
        }
        if (row.itemId) {
            const existingItem = ordersMap[row.id].items.find(i => i.itemId === row.itemId);
            if (!existingItem) {
                ordersMap[row.id].items.push({
                    itemId: row.itemId,
                    description: row.description,
                    quantity: row.quantity,
                    units: row.units,
                    price: row.itemPrice,
                });
            }
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
        totalPrice: orderData.totalPrice,
        items: itemRows.map(item => ({
          itemId: item.itemId,
          description: item.description,
          quantity: item.quantity,
          units: item.units,
          price: item.price,
        })),
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
    const [userRows] = await pool.query<RowDataPacket[]>("SELECT id, username, name, role FROM users WHERE id = ?", [userId]);
    if(userRows.length === 0) return null;

    const [branchRows] = await pool.query<RowDataPacket[]>("SELECT branchId FROM user_branches WHERE userId = ?", [userId]);
    
    const user = userRows[0] as User;
    user.branchIds = branchRows.map(r => r.branchId);
    
    return user;
}

export async function getUserByUsername(username: string): Promise<User | null> {
    const [userRows] = await pool.query<RowDataPacket[]>("SELECT * FROM users WHERE username = ?", [username]);
    if (userRows.length === 0) return null;

    const user = userRows[0] as User;
    const [branchRows] = await pool.query<RowDataPacket[]>("SELECT branchId FROM user_branches WHERE userId = ?", [user.id]);
    user.branchIds = branchRows.map(r => r.branchId);

    return user;
}

export async function getUsersAction(): Promise<User[]> {
    return fetchUsersWithBranches();
}

export async function addUserAction(data: Omit<User, 'id' | 'password'> & { password?: string; branchIds: string[] }): Promise<{ success: boolean; error?: string }> {
    const { username, name, role, password, branchIds } = data;
    if (!username || !name || !role || !password || !branchIds || branchIds.length === 0) {
        return { success: false, error: "All fields including at least one branch are required." };
    }
    
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
        return { success: false, error: "Username already exists. Please choose another." };
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await connection.query("INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)", 
          [userId, username, password, name, role]
        );

        const branchValues = branchIds.map(branchId => [userId, branchId]);
        await connection.query("INSERT INTO user_branches (userId, branchId) VALUES ?", [branchValues]);

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        console.error("Error adding user:", error);
        return { success: false, error: "Database error occurred while adding user." };
    } finally {
        connection.release();
    }
}

export async function updateUserAction(userId: string, data: Partial<Pick<User, 'name' | 'role' | 'password' | 'branchIds'>>): Promise<{ success: boolean, error?: string }> {
    const { name, role, password, branchIds } = data;
    if (!name || !role || !branchIds || branchIds.length === 0) {
        return { success: false, error: 'Name, role, and at least one branch are required.' };
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        let query = "UPDATE users SET name = ?, role = ?";
        const params: (string|string[])[] = [name, role];

        if (password && password.length > 0) {
            query += ", password = ?";
            params.push(password);
        }
        query += " WHERE id = ?";
        params.push(userId);

        await connection.query(query, params);
        
        // Update branches by deleting old ones and inserting new ones
        await connection.query("DELETE FROM user_branches WHERE userId = ?", [userId]);
        const branchValues = branchIds.map(branchId => [userId, branchId]);
        await connection.query("INSERT INTO user_branches (userId, branchId) VALUES ?", [branchValues]);

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        console.error('Failed to update user:', error);
        return { success: false, error: 'Database error occurred while updating user.' };
    } finally {
        connection.release();
    }
}


export async function deleteUserAction(userId: string): Promise<{ success: boolean, error?: string }> {
    try {
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

export async function verifyPasswordAction(username: string, plainTextPassword: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
        const user = await getUserByUsername(username);
        if (!user || !user.password) {
            return { success: false, error: "Invalid username or password." };
        }

        // Direct password comparison (insecure)
        const isMatch = plainTextPassword === user.password;

        if (isMatch) {
            // Do not send the password back to the client
            const { password, ...userWithoutPassword } = user;
            return { success: true, user: userWithoutPassword as User };
        } else {
            return { success: false, error: "Invalid username or password." };
        }
    } catch (error) {
        console.error('Password verification error:', error);
        return { success: false, error: 'An unexpected server error occurred.' };
    }
}

export async function updateMyPasswordAction(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
        const [userRows] = await pool.query<RowDataPacket[]>("SELECT password FROM users WHERE id = ?", [userId]);
        if (userRows.length === 0) {
            return { success: false, error: "User not found." };
        }
        const user = userRows[0];

        // Direct password comparison (insecure)
        if (user.password !== currentPassword) {
            return { success: false, error: "Incorrect current password." };
        }

        // Update to new password
        await pool.query("UPDATE users SET password = ? WHERE id = ?", [newPassword, userId]);
        return { success: true };

    } catch (error) {
        console.error('Error updating password:', error);
        return { success: false, error: 'A database error occurred.' };
    }
}
