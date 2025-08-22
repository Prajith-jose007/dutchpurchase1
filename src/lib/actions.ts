

"use server";

import type { CartItem, Order, OrderItem, User, Invoice, OrderStatus, Item, PurchaseReportData, DashboardData, MasterInvoice, MasterInvoiceDetails } from "@/lib/types";
import pool from '@/lib/db';
import type { RowDataPacket, OkPacket } from 'mysql2';
import { parseInventoryData } from "./inventoryParser";
import fs from 'fs/promises';
import path from 'path';
import { branches } from "@/data/appRepository";
import mime from 'mime';
import { subMonths, format } from 'date-fns';

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

    const newOrder = {
      id: orderId,
      branchId: branchId,
      userId: userId,
      createdAt: new Date(),
      status: "Pending",
      totalItems,
      totalPrice,
    };

    await connection.query("INSERT INTO orders (id, branchId, userId, createdAt, status, totalItems, totalPrice) VALUES (?, ?, ?, ?, ?, ?, ?)", 
      [newOrder.id, newOrder.branchId, newOrder.userId, newOrder.createdAt, newOrder.status, newOrder.totalItems, newOrder.totalPrice]
    );

    for (const item of cartItems) {
      await connection.query(
        "INSERT INTO order_items (orderId, itemId, description, quantity, units, price) VALUES (?, ?, ?, ?, ?, ?)",
        [
          orderId,
          item.code,
          item.description,
          item.quantity,
          item.units.trim(),
          item.price
        ]
      );
    }

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

export async function getOrdersAction(user: User): Promise<Order[]> {
    if (!user) return [];

    let query = `
        SELECT 
            o.id, o.branchId, o.userId, o.createdAt, o.status, o.totalItems, o.totalPrice, 
            o.receivedByUserId, o.receivedAt,
            placingUser.name as placingUserName,
            receivingUser.name as receivingUserName,
            o.invoiceNumber, o.invoiceNotes
        FROM orders o
        LEFT JOIN users placingUser ON o.userId = placingUser.id
        LEFT JOIN users receivingUser ON o.receivedByUserId = receivingUser.id
    `;
    const params: (string | number)[] = [];

    if (user.role === 'employee') {
        query += " WHERE o.userId = ?";
        params.push(user.id);
    }

    query += " ORDER BY o.createdAt DESC";

    const [orderRows] = await pool.query<RowDataPacket[]>(query, params);
    
    return orderRows.map(row => ({
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
        invoiceNumber: row.invoiceNumber,
        invoiceNotes: row.invoiceNotes,
        items: [], // Items are fetched on the details page
    }));
}


export async function getOrderByIdAction(orderId: string): Promise<Order | undefined> {
    const [orderRows] = await pool.query<RowDataPacket[]>("SELECT o.*, placingUser.name as placingUserName, receivingUser.name as receivingUserName FROM orders o LEFT JOIN users placingUser ON o.userId = placingUser.id LEFT JOIN users receivingUser ON o.receivedByUserId = receivingUser.id WHERE o.id = ?", [orderId]);
    if (orderRows.length === 0) return undefined;

    const orderData = orderRows[0];
    const [itemRows] = await pool.query<RowDataPacket[]>("SELECT itemId, description, quantity, units, price FROM order_items WHERE orderId = ?", [orderId]);
    
    const order: Order = {
        id: orderData.id,
        branchId: orderData.branchId,
        userId: orderData.userId,
        createdAt: new Date(orderData.createdAt).toISOString(),
        status: orderData.status,
        totalItems: Number(orderData.totalItems),
        totalPrice: Number(orderData.totalPrice),
        placingUserName: orderData.placingUserName,
        receivingUserName: orderData.receivingUserName,
        invoiceNumber: orderData.invoiceNumber,
        invoiceNotes: orderData.invoiceNotes,
        receivedByUserId: orderData.receivedByUserId,
        receivedAt: orderData.receivedAt ? new Date(orderData.receivedAt).toISOString() : null,
        items: itemRows.map(item => ({
          itemId: item.itemId,
          description: item.description,
          quantity: Number(item.quantity),
          units: item.units,
          price: Number(item.price),
        })),
    };
    return order;
}

export async function updateOrderStatusAction(
  orderId: string, 
  status: OrderStatus, 
  actorUserId: string,
  details?: { invoiceNumber?: string, invoiceNotes?: string }
): Promise<{ success: boolean; error?: string }> {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let orderUpdateQuery = "UPDATE orders SET status = ?, receivedByUserId = ?, receivedAt = ?";
        const orderUpdateParams: (string | Date | null)[] = [status, actorUserId, new Date()];

        if (status === 'Closed' && details?.invoiceNumber) {
            orderUpdateQuery += ", invoiceNumber = ?, invoiceNotes = ?";
            orderUpdateParams.push(details.invoiceNumber);
            orderUpdateParams.push(details.invoiceNotes || null);
        }

        orderUpdateQuery += " WHERE id = ?";
        orderUpdateParams.push(orderId);

        await connection.query(orderUpdateQuery, orderUpdateParams);

        if (status === 'Closed' && details?.invoiceNumber) {
            const invoiceNumbers = details.invoiceNumber.split(',').map(num => num.trim()).filter(Boolean);
            
            for (const invNumber of invoiceNumbers) {
                 const [existingMaster] = await connection.query<RowDataPacket[]>("SELECT id FROM master_invoices WHERE invoiceNumber = ?", [invNumber]);
                 let masterInvoiceId;

                 if (existingMaster.length > 0) {
                     masterInvoiceId = existingMaster[0].id;
                 } else {
                     const [newMasterResult] = await connection.query<OkPacket>(
                        "INSERT INTO master_invoices (invoiceNumber, notes, createdAt, uploaderId) VALUES (?, ?, ?, ?)",
                        [invNumber, details.invoiceNotes || null, new Date(), actorUserId]
                     );
                     masterInvoiceId = newMasterResult.insertId;
                 }
                 
                 await connection.query(
                    "INSERT INTO order_master_invoice_links (orderId, masterInvoiceId) VALUES (?, ?) ON DUPLICATE KEY UPDATE masterInvoiceId=masterInvoiceId",
                    [orderId, masterInvoiceId]
                 );
            }
        }
        
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

export async function updateOrderInvoiceDetailsAction(
  orderId: string,
  newInvoiceNumber: string,
  newInvoiceNotes: string | null,
  actor: User
): Promise<{ success: boolean, error?: string }> {
    if (!actor || !['admin', 'superadmin', 'purchase'].includes(actor.role)) {
        return { success: false, error: "Permission denied." };
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Step 1: Get the old masterInvoiceId this order was linked to
        const [linkRows] = await connection.query<RowDataPacket[]>("SELECT masterInvoiceId FROM order_master_invoice_links WHERE orderId = ?", [orderId]);
        const oldMasterInvoiceId = linkRows.length > 0 ? linkRows[0].masterInvoiceId : null;

        // Step 2: Unlink the order from the old master invoice
        await connection.query("DELETE FROM order_master_invoice_links WHERE orderId = ?", [orderId]);

        // Step 3: Find or create the new master invoice
        let newMasterInvoiceId;
        const [existingMaster] = await connection.query<RowDataPacket[]>("SELECT id FROM master_invoices WHERE invoiceNumber = ?", [newInvoiceNumber]);
        if (existingMaster.length > 0) {
            newMasterInvoiceId = existingMaster[0].id;
        } else {
            const [newMasterResult] = await connection.query<OkPacket>(
                "INSERT INTO master_invoices (invoiceNumber, createdAt, uploaderId) VALUES (?, ?, ?)",
                [newInvoiceNumber, new Date(), actor.id]
            );
            newMasterInvoiceId = newMasterResult.insertId;
        }

        // Step 4: Link the order to the new master invoice
        await connection.query(
            "INSERT INTO order_master_invoice_links (orderId, masterInvoiceId) VALUES (?, ?)",
            [orderId, newMasterInvoiceId]
        );

        // Step 5: Update the order itself with the new details
        await connection.query(
            "UPDATE orders SET invoiceNumber = ?, invoiceNotes = ? WHERE id = ?",
            [newInvoiceNumber, newInvoiceNotes, orderId]
        );

        // Step 6: [Optional but good practice] Check if the old master invoice is now orphaned
        if (oldMasterInvoiceId) {
            const [remainingLinks] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM order_master_invoice_links WHERE masterInvoiceId = ?", [oldMasterInvoiceId]);
            if (remainingLinks[0].count === 0) {
                // If no other orders are linked to it, delete the old master invoice
                await connection.query("DELETE FROM master_invoices WHERE id = ?", [oldMasterInvoiceId]);
            }
        }

        await connection.commit();
        return { success: true };

    } catch (error) {
        await connection.rollback();
        console.error("Failed to update order invoice details:", error);
        return { success: false, error: "A database error occurred." };
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

        await connection.query("DELETE FROM order_items WHERE orderId = ?", [orderId]);
        
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
    const [userRows] = await pool.query<RowDataPacket[]>("SELECT id, username, name, role, password FROM users WHERE id = ?", [userId]);
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

function isMysqlError(error: unknown): error is { code: string; errno: number; sql: string; sqlState: string; sqlMessage: string } {
    return typeof error === 'object' && error !== null && 'code' in error && 'sqlMessage' in error;
}

export async function uploadMasterInvoiceAction(formData: FormData): Promise<{ success: boolean, error?: string }> {
    const file = formData.get('invoiceFile') as File;
    const masterInvoiceId = formData.get('masterInvoiceId') as string;
    const userId = formData.get('userId') as string;

    if (!file) return { success: false, error: 'No file provided.' };
    if (!masterInvoiceId) return { success: false, error: 'Master Invoice ID is missing.' };
    if (!userId) return { success: false, error: 'User is not authenticated.' };
    
    const invoicesDir = path.join(process.cwd(), 'public', 'invoices');
    await fs.mkdir(invoicesDir, { recursive: true });
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = path.join(invoicesDir, uniqueFilename);
    await fs.writeFile(filePath, buffer);

    try {
        await pool.query(
            "UPDATE master_invoices SET fileName = ?, uploaderId = ? WHERE id = ?",
            [uniqueFilename, userId, masterInvoiceId]
        );
        return { success: true };
    } catch (error) {
        console.error('Failed to update master invoice:', error);
        return { success: false, error: 'Database error occurred.' };
    }
}

export async function getInvoicesAction(): Promise<Invoice[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT i.id, i.invoiceNumber, i.fileName, i.notes, i.uploadedAt, u.name as uploaderName 
     FROM invoices i 
     LEFT JOIN users u ON i.uploaderId = u.id 
     ORDER BY i.uploadedAt DESC`
  );
  return rows.map(r => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      fileName: r.fileName,
      notes: r.notes,
      uploadedAt: new Date(r.uploadedAt).toISOString(),
      uploaderName: r.uploaderName,
  }));
}

export async function deleteInvoiceAction(invoiceId: number): Promise<{ success: boolean, error?: string }> {
    const invoicesDir = path.join(process.cwd(), 'public', 'invoices');
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [invoiceRows] = await connection.query<RowDataPacket[]>("SELECT fileName FROM invoices WHERE id = ?", [invoiceId]);
        if (invoiceRows.length === 0) {
            await connection.rollback();
            return { success: false, error: "Invoice not found." };
        }
        const fileName = invoiceRows[0].fileName;

        const [result] = await connection.query<OkPacket>("DELETE FROM invoices WHERE id = ?", [invoiceId]);
        
        if (result.affectedRows === 0) {
            await connection.rollback();
            return { success: false, error: "Invoice not found in the database." };
        }

        if (fileName) {
          const filePath = path.join(invoicesDir, fileName);
          try {
              await fs.unlink(filePath);
          } catch (fileError: any) {
              if (fileError.code !== 'ENOENT') {
                  await connection.rollback();
                  console.error("Failed to delete invoice file:", fileError);
                  return { success: false, error: "Failed to delete the invoice file from storage." };
              }
          }
        }

        await connection.commit();
        return { success: true };

    } catch (error) {
        await connection.rollback();
        console.error("Failed to delete invoice:", error);
        return { success: false, error: "A database error occurred." };
    } finally {
        connection.release();
    }
}

export async function verifyPasswordAction(username: string, plainTextPassword: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
        const user = await getUserByUsername(username);
        if (!user || !user.password) {
            return { success: false, error: "Invalid username or password." };
        }

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

        if (user.password !== currentPassword) {
            return { success: false, error: "Incorrect current password." };
        }

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
    return rows.map(row => ({
        ...row,
        packing: Number(row.packing),
        shelfLifeDays: Number(row.shelfLifeDays),
        price: Number(row.price),
    })) as Item[];
}

export async function addItemAction(item: Item): Promise<{ success: boolean; error?: string }> {
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
                item.code, 
                item.remark || null, 
                item.itemType, 
                item.category, 
                item.description, 
                item.detailedDescription,
                item.units, 
                item.packing, 
                item.shelfLifeDays || 0,
                item.price
            ];
            await connection.query(
                `INSERT INTO items (code, remark, itemType, category, description, detailedDescription, units, packing, shelfLifeDays, price) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 remark=VALUES(remark), itemType=VALUES(itemType), category=VALUES(category), description=VALUES(description), detailedDescription=VALUES(detailedDescription),
                 units=VALUES(units), packing=VALUES(packing), shelfLifeDays=VALUES(shelfLifeDays), price=VALUES(price)`,
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
        return 0;
    }
}

export async function getPurchaseReportDataAction(): Promise<PurchaseReportData | null> {
    try {
        const baseQuery = "SELECT SUM(totalPrice) as total FROM orders WHERE status = 'Closed'";

        const [[daily]] = await pool.query<RowDataPacket[]>(`${baseQuery} AND DATE(receivedAt) = CURDATE()`);
        const [[monthly]] = await pool.query<RowDataPacket[]>(`${baseQuery} AND YEAR(receivedAt) = YEAR(CURDATE()) AND MONTH(receivedAt) = MONTH(CURDATE())`);
        const [[yearly]] = await pool.query<RowDataPacket[]>(`${baseQuery} AND YEAR(receivedAt) = YEAR(CURDATE())`);
        
        const [branchMonthlyData] = await pool.query<RowDataPacket[]>(`
            SELECT
                DATE_FORMAT(receivedAt, '%Y-%m') as month,
                b.name as branchName,
                SUM(o.totalPrice) as total
            FROM orders o
            JOIN branches b ON o.branchId = b.id
            WHERE o.status = 'Closed' AND o.receivedAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY month, b.name
            ORDER BY month, b.name
        `);

        // Get all branch names that aren't 'All Branches'
        const allBranchNames = branches.filter(b => b.id !== 'branch-all').map(b => b.name);
        const monthlyTotals: { [key: string]: { month: string; [key: string]: number | string } } = {};

        // Initialize the structure for the last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthKey = format(date, 'yyyy-MM');
            const monthLabel = format(date, 'MMM');
            
            monthlyTotals[monthKey] = { month: monthLabel };
            allBranchNames.forEach(name => {
                monthlyTotals[monthKey][name] = 0; // Initialize each branch with 0
            });
        }
        
        // Populate with actual data
        branchMonthlyData.forEach(row => {
            const monthKey = row.month;
            const branchName = row.branchName;
            if (monthlyTotals[monthKey] && branchName) {
                monthlyTotals[monthKey][branchName] = parseFloat(row.total);
            }
        });
        
        return {
            totalToday: daily.total || 0,
            totalThisMonth: monthly.total || 0,
            totalThisYear: yearly.total || 0,
            chartData: Object.values(monthlyTotals),
        };

    } catch (error) {
        console.error("Failed to fetch purchase report data:", error);
        return null;
    }
}

export async function getDashboardDataAction(): Promise<DashboardData | null> {
    try {
        const allQueries = [
            pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM orders WHERE DATE(createdAt) = CURDATE()"),
            pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('Closed', 'Cancelled')"),
            pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM orders WHERE status = 'Closed' AND DATE(receivedAt) = CURDATE()"),
            pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'"),
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

        const [
          totalOrdersTodayResult,
          activeOrdersResult,
          closedOrdersTodayResult,
          pendingOrdersResult,
          totalPurchasesResult,
          dailyPurchasesResult,
          monthlyPurchasesResult,
          storePurchasesResult,
        ] = await Promise.all(allQueries);

        const summary = {
            totalOrdersToday: Number(totalOrdersTodayResult[0]?.[0]?.count ?? 0),
            activeOrders: Number(activeOrdersResult[0]?.[0]?.count ?? 0),
            closedOrdersToday: Number(closedOrdersTodayResult[0]?.[0]?.count ?? 0),
            pendingOrders: Number(pendingOrdersResult[0]?.[0]?.count ?? 0),
        };

        const branchNameMap = new Map(branches.map(b => [b.id, b.name]));

        const totalPurchasesData = totalPurchasesResult[0] || [];
        const dailyPurchasesData = dailyPurchasesResult[0] || [];
        const monthlyPurchasesData = monthlyPurchasesResult[0] || [];
        const storePurchasesData = storePurchasesResult[0] || [];

        const dashboardData: DashboardData = {
            summary,
            totalPurchases: totalPurchasesData.map(r => ({ month: new Date(r.month + '-02').toLocaleString('default', { month: 'short' }), total: parseFloat(r.total || 0) })),
            dailyPurchases: dailyPurchasesData.map(r => ({ day: new Date(r.day).toLocaleString('default', { weekday: 'short' }), total: parseFloat(r.total || 0) })),
            monthlyPurchases: monthlyPurchasesData.map(r => ({ month: new Date(r.month + '-02').toLocaleString('default', { month: 'short' }), total: parseFloat(r.total || 0) })),
            storePurchases: storePurchasesData.map(r => ({ name: branchNameMap.get(r.branchId) || r.branchId, value: parseFloat(r.total || 0) })),
        };
        
        return dashboardData;

    } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        return null;
    }
}

// Master Invoice Actions
export async function getMasterInvoicesAction(): Promise<MasterInvoice[]> {
    const query = `
        SELECT 
            mi.id, mi.invoiceNumber, mi.fileName, mi.notes, mi.createdAt,
            u.name as uploaderName,
            COUNT(link.orderId) as orderCount,
            SUM(o.totalPrice) as totalAmount
        FROM master_invoices mi
        LEFT JOIN users u ON mi.uploaderId = u.id
        LEFT JOIN order_master_invoice_links link ON mi.id = link.masterInvoiceId
        LEFT JOIN orders o ON link.orderId = o.id
        GROUP BY mi.id, mi.invoiceNumber, mi.fileName, mi.notes, mi.createdAt, u.name
        ORDER BY mi.createdAt DESC
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows.map(row => ({
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        fileName: row.fileName,
        notes: row.notes,
        createdAt: new Date(row.createdAt).toISOString(),
        uploaderName: row.uploaderName,
        orderCount: Number(row.orderCount),
        totalAmount: Number(row.totalAmount),
    })) as MasterInvoice[];
}

export async function getMasterInvoiceDetailsAction(invoiceNumber: string): Promise<MasterInvoiceDetails | null> {
    const connection = await pool.getConnection();
    try {
        const [masterInvoiceRows] = await connection.query<RowDataPacket[]>(
            `SELECT mi.*, u.name as uploaderName FROM master_invoices mi LEFT JOIN users u ON mi.uploaderId = u.id WHERE mi.invoiceNumber = ?`, [invoiceNumber]
        );
        if (masterInvoiceRows.length === 0) return null;
        
        const masterInvoiceData = masterInvoiceRows[0];
        const masterInvoiceId = masterInvoiceData.id;

        const [linkedOrders] = await connection.query<RowDataPacket[]>(`
            SELECT o.*, u.name as placingUserName FROM orders o 
            JOIN order_master_invoice_links link ON o.id = link.orderId
            JOIN users u ON o.userId = u.id
            WHERE link.masterInvoiceId = ?
        `, [masterInvoiceId]);
        
        const orderIds = linkedOrders.map(o => o.id);
        if(orderIds.length === 0) { // Handle case where master invoice exists but no orders are linked
             return {
                id: masterInvoiceData.id,
                invoiceNumber: masterInvoiceData.invoiceNumber,
                fileName: masterInvoiceData.fileName,
                notes: masterInvoiceData.notes,
                createdAt: new Date(masterInvoiceData.createdAt).toISOString(),
                uploaderName: masterInvoiceData.uploaderName,
                orderCount: 0,
                totalAmount: 0,
                orders: [],
                consolidatedItems: [],
                involvedBranches: []
            } as MasterInvoiceDetails;
        }

        const [orderItems] = await connection.query<RowDataPacket[]>(`SELECT * FROM order_items WHERE orderId IN (?)`, [orderIds]);

        const consolidatedItemsMap = new Map<string, OrderItem>();
        orderItems.forEach(item => {
            const key = `${item.itemId}-${item.price}`;
            if (consolidatedItemsMap.has(key)) {
                const existing = consolidatedItemsMap.get(key)!;
                existing.quantity += parseFloat(item.quantity);
            } else {
                consolidatedItemsMap.set(key, {
                    itemId: item.itemId,
                    description: item.description,
                    quantity: parseFloat(item.quantity),
                    units: item.units,
                    price: parseFloat(item.price)
                });
            }
        });
        
        const involvedBranchesSet = new Set<string>();
        const branchNameMap = new Map(branches.map(b => [b.id, b.name]));
        linkedOrders.forEach(o => involvedBranchesSet.add(branchNameMap.get(o.branchId) || o.branchId));
        
        const totalAmount = linkedOrders.reduce((sum, o) => sum + parseFloat(o.totalPrice), 0);

        return {
            id: masterInvoiceData.id,
            invoiceNumber: masterInvoiceData.invoiceNumber,
            fileName: masterInvoiceData.fileName,
            notes: masterInvoiceData.notes,
            createdAt: new Date(masterInvoiceData.createdAt).toISOString(),
            uploaderName: masterInvoiceData.uploaderName,
            orderCount: linkedOrders.length,
            totalAmount: totalAmount,
            orders: linkedOrders,
            consolidatedItems: Array.from(consolidatedItemsMap.values()),
            involvedBranches: Array.from(involvedBranchesSet)
        } as MasterInvoiceDetails;

    } catch (error) {
        console.error("Failed to fetch master invoice details:", error);
        return null;
    } finally {
        connection.release();
    }
}

// BATCH INVOICING ACTIONS
export async function getOrdersForBatchClosingAction(
    date: string, 
    status: 'Pending' | 'Arrived' | 'All'
): Promise<Order[]> {
    let query = `
        SELECT o.id, o.branchId, o.userId, o.createdAt, o.status, o.totalPrice, u.name as placingUserName, b.name as branchName
        FROM orders o
        JOIN users u ON o.userId = u.id
        JOIN branches b ON o.branchId = b.id
        WHERE DATE(o.createdAt) = ?
    `;
    const params: string[] = [date];

    if (status !== 'All') {
        query += ` AND o.status = ?`;
        params.push(status);
    }
    
    query += ` ORDER BY o.createdAt DESC`;
    
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    
    return rows.map(row => ({
        id: row.id,
        branchId: row.branchId,
        userId: row.userId,
        createdAt: new Date(row.createdAt).toISOString(),
        status: row.status,
        totalPrice: Number(row.totalPrice),
        placingUserName: row.placingUserName,
        placingUser: { branchName: row.branchName }, // Nesting for consistency
        items: [],
        totalItems: 0,
    }));
}

export async function batchCloseOrdersAction(
    formData: FormData
): Promise<{ success: boolean; error?: string; count?: number }> {
    const orderIdsJSON = formData.get('orderIds') as string;
    const invoiceNumber = formData.get('invoiceNumber') as string;
    const invoiceNotes = formData.get('invoiceNotes') as string;
    const invoiceFile = formData.get('invoiceFile') as File | null;
    const userId = formData.get('userId') as string;

    if (!orderIdsJSON || !invoiceNumber || !userId) {
        return { success: false, error: 'Missing required data.' };
    }
    const orderIds = JSON.parse(orderIdsJSON);
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return { success: false, error: 'No orders were selected.' };
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Handle file upload if it exists
        let uniqueFilename: string | null = null;
        if (invoiceFile) {
            const invoicesDir = path.join(process.cwd(), 'public', 'invoices');
            await fs.mkdir(invoicesDir, { recursive: true });
            const buffer = Buffer.from(await invoiceFile.arrayBuffer());
            uniqueFilename = `${Date.now()}-${invoiceFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const filePath = path.join(invoicesDir, uniqueFilename);
            await fs.writeFile(filePath, buffer);
        }

        // 2. Find or create the master invoice
        let masterInvoiceId;
        const [existingMaster] = await connection.query<RowDataPacket[]>("SELECT id FROM master_invoices WHERE invoiceNumber = ?", [invoiceNumber]);
        if (existingMaster.length > 0) {
            masterInvoiceId = existingMaster[0].id;
            // If a new file is uploaded for an existing master invoice, update its filename
            if (uniqueFilename) {
                 await connection.query("UPDATE master_invoices SET fileName = ?, uploaderId = ? WHERE id = ?", [uniqueFilename, userId, masterInvoiceId]);
            }
        } else {
            const [newMasterResult] = await connection.query<OkPacket>(
                "INSERT INTO master_invoices (invoiceNumber, notes, createdAt, uploaderId, fileName) VALUES (?, ?, ?, ?, ?)",
                [invoiceNumber, invoiceNotes || null, new Date(), userId, uniqueFilename]
            );
            masterInvoiceId = newMasterResult.insertId;
        }

        // 3. Update all selected orders and link them
        const updatePromises = orderIds.map(orderId => {
            return Promise.all([
                 connection.query(
                    "UPDATE orders SET status = 'Closed', receivedByUserId = ?, receivedAt = ?, invoiceNumber = ?, invoiceNotes = ? WHERE id = ?",
                    ['Closed', userId, new Date(), invoiceNumber, invoiceNotes || null, orderId]
                ),
                 connection.query(
                    "INSERT INTO order_master_invoice_links (orderId, masterInvoiceId) VALUES (?, ?) ON DUPLICATE KEY UPDATE masterInvoiceId=VALUES(masterInvoiceId)",
                    [orderId, masterInvoiceId]
                )
            ]);
        });
        
        await Promise.all(updatePromises);

        await connection.commit();
        return { success: true, count: orderIds.length };

    } catch (error) {
        await connection.rollback();
        console.error("Failed to batch close orders:", error);
        return { success: false, error: 'A database error occurred during the batch closing process.' };
    } finally {
        connection.release();
    }
}
