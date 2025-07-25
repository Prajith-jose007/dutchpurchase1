
"use server";

import type { CartItem, Order, OrderItem, User, Invoice, OrderStatus, Item, PurchaseReportData, DashboardData } from "@/lib/types";
import pool from '@/lib/db';
import type { RowDataPacket, OkPacket } from 'mysql2';
import { parseInventoryData } from "./inventoryParser";
import fs from 'fs/promises';
import path from 'path';
import { branches } from "@/data/appRepository";
import mime from 'mime';

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
        SELECT 
            o.id, o.branchId, o.userId, o.createdAt, o.status, o.totalItems, o.totalPrice, 
            o.receivedByUserId, o.receivedAt,
            placingUser.name as placingUserName,
            receivingUser.name as receivingUserName,
            oi.itemId, oi.description, oi.quantity, oi.units, oi.price as itemPrice,
            inv.fileName as invoiceFileName
        FROM orders o
        LEFT JOIN users placingUser ON o.userId = placingUser.id
        LEFT JOIN users receivingUser ON o.receivedByUserId = receivingUser.id
        LEFT JOIN order_items oi ON o.id = oi.orderId
        LEFT JOIN invoices inv ON o.id = inv.orderId
    `;
    const params: (string | number)[] = [];

    // Admins and Purchase roles see all orders. Employees see only their own.
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
                totalItems: Number(row.totalItems),
                totalPrice: Number(row.totalPrice),
                receivedByUserId: row.receivedByUserId,
                receivedAt: row.receivedAt ? new Date(row.receivedAt).toISOString() : null,
                placingUserName: row.placingUserName,
                receivingUserName: row.receivingUserName,
                lastUpdatedByUserName: row.receivingUserName, // Re-map for clarity
                lastUpdatedAt: row.receivedAt ? new Date(row.receivedAt).toISOString() : null,
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
                    quantity: Number(row.quantity),
                    units: row.units,
                    price: Number(row.itemPrice),
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
        totalItems: Number(orderData.totalItems),
        totalPrice: Number(orderData.totalPrice),
        receivedByUserId: orderData.receivedByUserId,
        receivedAt: orderData.receivedAt ? new Date(orderData.receivedAt).toISOString() : null,
        items: itemRows.map(item => ({
          itemId: item.itemId,
          description: item.description,
          quantity: Number(item.quantity),
          units: item.units,
          price: Number(item.price),
        })),
        invoiceFileNames: invoiceRows.map(r => r.fileName)
    };
    return order;
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus, actorUserId: string): Promise<{ success: boolean; error?: string }> {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [currentOrderRows] = await pool.query<RowDataPacket[]>("SELECT status FROM orders WHERE id = ?", [orderId]);

        if (currentOrderRows.length === 0) {
            await connection.rollback();
            connection.release();
            return { success: false, error: "Order not found." };
        }
        
        // Always update status, actor, and timestamp
        const query = `UPDATE orders SET status = ?, receivedByUserId = ?, receivedAt = ? WHERE id = ?`;
        const params = [status, actorUserId, new Date(), orderId];

        await connection.query(query, params);
        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        console.error("Failed to update order status:", error);
        return { success: false, error: "Database error: Failed to update status." };
    } finally {
        connection.release();
    }
}

export async function deleteOrderAction(orderId: string, actor: User): Promise<{ success: boolean, error?: string }> {
    if (!actor || !['admin', 'superadmin'].includes(actor.role)) {
        return { success: false, error: "Permission denied. Only admins can delete orders." };
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Delete associated order items first to respect foreign key constraints
        await connection.query("DELETE FROM order_items WHERE orderId = ?", [orderId]);
        
        // Unlink any attached invoices (set orderId to NULL)
        await connection.query("UPDATE invoices SET orderId = NULL WHERE orderId = ?", [orderId]);

        // Delete the order itself
        const [result] = await connection.query<OkPacket>("DELETE FROM orders WHERE id = ?", [orderId]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return { success: false, error: "Order not found or could not be deleted." };
        }

        await connection.commit();
        return { success: true };

    } catch (error) {
        await connection.rollback();
        console.error('Failed to delete order:', error);
        return { success: false, error: 'Database error occurred while deleting the order.' };
    } finally {
        connection.release();
    }
}


export async function getUser(userId: string): Promise<User | null> {
    if (!userId) return null;
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
    const files = formData.getAll('invoices') as File[];
    const userId = formData.get('userId') as string;
    const orderId = formData.get('orderId') as string;

    if (!files || files.length === 0) return { success: false, error: 'No files were uploaded.' };
    if (!userId) return { success: false, error: 'User is not authenticated.' };
    if (!orderId) return { success: false, error: 'Order ID is missing.' };


    const invoicesDir = path.join(process.cwd(), 'public', 'invoices');
    const connection = await pool.getConnection();

    try {
        await fs.mkdir(invoicesDir, { recursive: true });
        await connection.beginTransaction();

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const filePath = path.join(invoicesDir, file.name);
            await fs.writeFile(filePath, buffer);
            
            await connection.query(
                "INSERT INTO invoices (fileName, uploaderId, orderId) VALUES (?, ?, ?)", 
                [file.name, userId, orderId]
            );
        }

        await connection.commit();
        return { success: true, fileCount: files.length };
    } catch (error) {
        await connection.rollback();
        console.error('Invoice upload failed:', error);
        if (isMysqlError(error) && error.code === 'ER_DUP_ENTRY') {
             return { success: false, error: 'One or more files with these names have already been uploaded. Please rename the file and try again.' };
        }
        return { success: false, error: 'An error occurred during invoice upload.' };
    } finally {
        connection.release();
    }
}

// Type guard to check for MySQL errors
function isMysqlError(error: unknown): error is { code: string; errno: number; sql: string; sqlState: string; sqlMessage: string } {
    return typeof error === 'object' && error !== null && 'code' in error && 'sqlMessage' in error;
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

        // Direct password comparison (insecure, for prototype only)
        if (plainTextPassword === user.password) {
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

// INVENTORY ACTIONS

export async function getItemsAction(): Promise<Item[]> {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM items ORDER BY code ASC");
    // Ensure numeric fields are numbers
    return rows.map(row => ({
        ...row,
        packing: Number(row.packing),
        shelfLifeDays: Number(row.shelfLifeDays),
        price: Number(row.price),
    })) as Item[];
}

export async function addItemAction(item: Omit<Item, 'remark' | 'detailedDescription'> & { remark?: string, detailedDescription?: string | null }): Promise<{ success: boolean; error?: string }> {
    try {
        await pool.query(
            "INSERT INTO items (code, remark, itemType, category, description, detailedDescription, units, packing, shelfLifeDays, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [item.code, item.remark || null, item.itemType, item.category, item.description, item.detailedDescription, item.units, item.packing, item.shelfLifeDays, item.price]
        );
        return { success: true };
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return { success: false, error: `Item with code ${item.code} already exists.` };
        }
        console.error("Error adding item:", error);
        return { success: false, error: "A database error occurred." };
    }
}

export async function updateItemAction(item: Item): Promise<{ success: boolean; error?: string }> {
    try {
        const [result] = await pool.query<OkPacket>(
            "UPDATE items SET remark = ?, itemType = ?, category = ?, description = ?, detailedDescription = ?, units = ?, packing = ?, shelfLifeDays = ?, price = ? WHERE code = ?",
            [item.remark, item.itemType, item.category, item.description, item.detailedDescription, item.units, item.packing, item.shelfLifeDays, Number(item.price), item.code]
        );
        if (result.affectedRows === 0) {
            return { success: false, error: "Item not found." };
        }
        return { success: true };
    } catch (error) {
        console.error("Error updating item:", error);
        return { success: false, error: "A database error occurred." };
    }
}

export async function deleteItemAction(code: string): Promise<{ success: boolean; error?: string }> {
    try {
        const [result] = await pool.query<OkPacket>("DELETE FROM items WHERE code = ?", [code]);
        if (result.affectedRows > 0) {
            return { success: true };
        } else {
            return { success: false, error: "Item not found." };
        }
    } catch (error) {
        console.error("Error deleting item:", error);
        return { success: false, error: "A database error occurred." };
    }
}

export async function importInventoryAction(formData: FormData): Promise<{ success: boolean; count?: number; error?: string }> {
    const file = formData.get('inventoryFile') as File;
    if (!file) {
        return { success: false, error: "No file was provided." };
    }

    const fileContent = await file.text();
    const items = parseInventoryData(fileContent);

    if (items.length === 0) {
        return { success: false, error: "Could not parse any items from the file. Please check the format." };
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        for (const item of items) {
            const values = [
                item.code, item.remark || null, item.itemType, item.category, 
                item.description, item.detailedDescription, item.units, item.packing, item.shelfLifeDays, item.price
            ];
            // Use INSERT ... ON DUPLICATE KEY UPDATE to either insert a new item or update an existing one.
            await connection.query(
                `INSERT INTO items (code, remark, itemType, category, description, detailedDescription, units, packing, shelfLifeDays, price) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 remark=VALUES(remark), itemType=VALUES(itemType), category=VALUES(category), description=VALUES(description), 
                 detailedDescription=VALUES(detailedDescription), units=VALUES(units), packing=VALUES(packing), shelfLifeDays=VALUES(shelfLifeDays), price=VALUES(price)`,
                values
            );
        }

        await connection.commit();
        return { success: true, count: items.length };
    } catch (error) {
        await connection.rollback();
        console.error("Error importing inventory:", error);
        return { success: false, error: "A database error occurred during the import process." };
    } finally {
        connection.release();
    }
}

export async function getPendingOrdersCountAction(): Promise<number> {
    try {
        const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'");
        if (rows.length > 0) {
            return Number(rows[0].count);
        }
        return 0;
    } catch (error) {
        console.error("Failed to fetch pending orders count:", error);
        return 0; // Return 0 on error to avoid breaking the UI
    }
}

export async function getPurchaseReportDataAction(): Promise<PurchaseReportData> {
    try {
        const baseQuery = "SELECT SUM(totalPrice) as total FROM orders WHERE status = 'Closed'";

        const [[daily]] = await pool.query<RowDataPacket[]>(`${baseQuery} AND DATE(receivedAt) = CURDATE()`);
        const [[monthly]] = await pool.query<RowDataPacket[]>(`${baseQuery} AND YEAR(receivedAt) = YEAR(CURDATE()) AND MONTH(receivedAt) = MONTH(CURDATE())`);
        const [[yearly]] = await pool.query<RowDataPacket[]>(`${baseQuery} AND YEAR(receivedAt) = YEAR(CURDATE())`);
        
        const [branchMonthlyData] = await pool.query<RowDataPacket[]>(`
            SELECT
                DATE_FORMAT(receivedAt, '%Y-%m') as month,
                branchId,
                SUM(totalPrice) as total
            FROM orders
            WHERE status = 'Closed' AND receivedAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY month, branchId
            ORDER BY month, branchId
        `);

        // Format data for the chart
        const monthlyTotals: { [key: string]: { month: string; [key: string]: number | string } } = {};
        const branchNameMap = new Map(branches.map(b => [b.id, b.name]));

        branchMonthlyData.forEach(row => {
            const month = row.month;
            const branchName = branchNameMap.get(row.branchId) || row.branchId;

            if (!monthlyTotals[month]) {
                monthlyTotals[month] = { month: new Date(month + '-02').toLocaleString('default', { month: 'short' }) };
            }
            monthlyTotals[month][branchName] = (monthlyTotals[month][branchName] || 0) as number + parseFloat(row.total);
        });
        
        return {
            totalToday: daily.total || 0,
            totalThisMonth: monthly.total || 0,
            totalThisYear: yearly.total || 0,
            chartData: Object.values(monthlyTotals),
        };

    } catch (error) {
        console.error("Failed to fetch purchase report data:", error);
        // Return a default object on error to prevent crashing the page
        return {
            totalToday: 0,
            totalThisMonth: 0,
            totalThisYear: 0,
            chartData: [],
        };
    }
}

export async function getDashboardDataAction(): Promise<DashboardData> {
    try {
        const allQueries = [
            // Summary Queries
            pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM orders WHERE DATE(createdAt) = CURDATE()"),
            pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('Closed', 'Cancelled')"),
            pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM orders WHERE status = 'Closed' AND DATE(receivedAt) = CURDATE()"),
            pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'"),
            // Graph Queries
            pool.query<RowDataPacket[]>(`
                SELECT DATE_FORMAT(receivedAt, '%Y-%m') as month, SUM(totalPrice) as total
                FROM orders WHERE status = 'Closed' AND receivedAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                GROUP BY month ORDER BY month ASC
            `),
            pool.query<RowDataPacket[]>(`
                SELECT DATE(receivedAt) as day, SUM(totalPrice) as total
                FROM orders WHERE status = 'Closed' AND receivedAt >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY day ORDER BY day ASC
            `),
            pool.query<RowDataPacket[]>(`
                 SELECT DATE_FORMAT(receivedAt, '%Y-%m') as month, SUM(totalPrice) as total
                 FROM orders WHERE status = 'Closed' AND receivedAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                 GROUP BY month ORDER BY month ASC
            `),
            pool.query<RowDataPacket[]>(`
                SELECT branchId, SUM(totalPrice) as total
                FROM orders WHERE status = 'Closed'
                GROUP BY branchId
            `)
        ];

        const results = await Promise.all(allQueries);

        const summary = {
            totalOrdersToday: Number(results[0][0][0].count),
            activeOrders: Number(results[1][0][0].count),
            closedOrdersToday: Number(results[2][0][0].count),
            pendingOrders: Number(results[3][0][0].count),
        };

        const branchNameMap = new Map(branches.map(b => [b.id, b.name]));

        const dashboardData: DashboardData = {
            summary,
            totalPurchases: results[4][0].map(r => ({ month: new Date(r.month + '-02').toLocaleString('default', { month: 'short' }), total: parseFloat(r.total) })),
            dailyPurchases: results[5][0].map(r => ({ day: new Date(r.day).toLocaleString('default', { weekday: 'short' }), total: parseFloat(r.total) })),
            monthlyPurchases: results[6][0].map(r => ({ month: new Date(r.month + '-02').toLocaleString('default', { month: 'short' }), total: parseFloat(r.total) })),
            storePurchases: results[7][0].map(r => ({ name: branchNameMap.get(r.branchId) || r.branchId, value: parseFloat(r.total) })),
        };
        
        return dashboardData;

    } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        throw new Error("Could not load dashboard data.");
    }
}

    