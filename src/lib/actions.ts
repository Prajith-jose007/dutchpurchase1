
"use server";

import type { CartItem, Order, OrderItem, User, UserRole } from "@/lib/types";
import { 
  branches, 
  users as allUsers,
  saveOrder as saveOrderToRepository, 
  getOrders as getOrdersFromRepository, 
  getOrderById as getOrderByIdFromRepository,
  saveUser as saveUserToRepository,
  getUsers as getUsersFromRepository,
  getUserByUsername
} from "@/data/appRepository";
import { redirect } from "next/navigation";
import { getItemByCode } from "@/data/inventoryItems";


export async function submitOrderAction(cartItems: CartItem[], branchId: string, userId: string): Promise<{ success: boolean; orderId?: string; error?: string }> {
  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: "Cart is empty." };
  }

  const branch = branches.find(b => b.id === branchId);
  const user = allUsers.find(u => u.id === userId);

  if (!branch || !user) {
    return { success: false, error: "Invalid branch or user."}
  }

  try {
    const orderItems: OrderItem[] = cartItems.map(item => ({
      itemId: item.code,
      description: item.description,
      quantity: item.quantity,
      units: item.units,
    }));

    const newOrder: Order = {
      id: `order-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      branchId,
      userId,
      createdAt: new Date().toISOString(),
      status: "Pending",
      items: orderItems,
      totalItems: orderItems.reduce((sum, item) => sum + item.quantity, 0),
    };

    saveOrderToRepository(newOrder); 

    console.log("Order submitted:", newOrder);

    return { success: true, orderId: newOrder.id };
  } catch (error) {
    console.error("Failed to submit order:", error);
    return { success: false, error: "Failed to submit order. Please try again." };
  }
}

export async function getOrdersAction(user: User | null): Promise<Order[]> {
    if (!user) {
        return []; // Return no orders if user is not logged in
    }

    const allOrders = getOrdersFromRepository();

    // Admin, superadmin, and purchase roles see all orders
    if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'purchase') {
        return Promise.resolve(allOrders);
    }
    
    // Employees see only their own orders
    if (user.role === 'employee') {
        return Promise.resolve(allOrders.filter(order => order.userId === user.id));
    }
    
    return []; // Default to no orders if role is unrecognized
}


export async function getOrderByIdAction(orderId: string): Promise<Order | undefined> {
  return Promise.resolve(getOrderByIdFromRepository(orderId));
}

// Action to get user by ID - useful for rehydrating auth state
export async function getUser(userId: string): Promise<User | null> {
    const user = allUsers.find(u => u.id === userId) || null;
    if (user) {
        const { password, ...userWithoutPassword } = user; // Never send password to client
        return userWithoutPassword as User;
    }
    return null;
}


// Action to get all users (without passwords)
export async function getUsersAction(): Promise<User[]> {
  try {
    const users = getUsersFromRepository();
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

// Action to add a new user
interface AddUserResult {
  success: boolean;
  error?: string;
}

export async function addUserAction(userData: Omit<User, 'id'>): Promise<AddUserResult> {
  // Basic validation
  if (!userData.username || !userData.password || !userData.name || !userData.branchId || !userData.role) {
    return { success: false, error: "All fields are required." };
  }

  // Check if username already exists
  if (getUserByUsername(userData.username)) {
      return { success: false, error: "Username already exists. Please choose another." };
  }

  try {
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...userData,
    };
    saveUserToRepository(newUser);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("Error adding user:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Action to handle invoice uploads
export async function uploadInvoicesAction(formData: FormData): Promise<{ success: boolean; fileCount?: number; error?: string }> {
  try {
    const files = formData.getAll('invoices') as File[];
    const userId = formData.get('userId') as string;

    if (!files || files.length === 0) {
      return { success: false, error: 'No files were uploaded.' };
    }
     if (!userId) {
      return { success: false, error: 'User is not authenticated.' };
    }

    console.log(`User ${userId} is uploading ${files.length} invoices.`);
    
    // ---
    // In a real application, you would process each file here:
    // - Generate a unique filename
    // - Upload to a cloud storage service (e.g., Firebase Storage, AWS S3)
    // - Save metadata (filename, URL, uploaderId, timestamp) to your database
    // For this prototype, we'll just log the file details.
    // ---
    
    for (const file of files) {
      console.log(`Simulating upload for: ${file.name} (${file.size} bytes)`);
    }

    return { success: true, fileCount: files.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    console.error('Invoice upload failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
