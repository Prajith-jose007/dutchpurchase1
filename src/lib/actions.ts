
// src/lib/actions.ts
"use server";

import type { CartItem, Order, OrderItem, User } from "@/lib/types";
import { branches, users, saveOrder as saveOrderToRepository, getOrders as getOrdersFromRepository, getOrderById as getOrderByIdFromRepository } from "@/data/appRepository";
import { redirect } from "next/navigation";
import { getItemByCode } from "@/data/inventoryItems";
import type { ForecastDemandInput, ForecastDemandOutput } from '@/ai/flows/demand-forecasting';
import { forecastDemand } from '@/ai/flows/demand-forecasting';


export async function submitOrderAction(cartItems: CartItem[], branchId: string, userId: string): Promise<{ success: boolean; orderId?: string; error?: string }> {
  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: "Cart is empty." };
  }

  const branch = branches.find(b => b.id === branchId);
  const user = users.find(u => u.id === userId);

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
    const user = users.find(u => u.id === userId) || null;
    if (user) {
        const { password, ...userWithoutPassword } = user; // Never send password to client
        return userWithoutPassword as User;
    }
    return null;
}

export async function handleDemandForecastAction(): Promise<{ success: boolean; data?: ForecastDemandOutput; error?: string }> {
  try {
    const historicalOrderData = await getSampleHistoricalDataCSVAction();
    const input: ForecastDemandInput = {
      historicalOrderData,
      forecastHorizon: 'next week',
      branch: 'All Branches',
    };
    const result = await forecastDemand(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error during demand forecast:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

export async function getSampleHistoricalDataCSVAction(): Promise<string> {
    const orders = getOrdersFromRepository();
    // Header for the CSV file
    let csvContent = "date,item_code,quantity,branch_name\n";
    
    // Convert each order item into a CSV row
    orders.forEach(order => {
        const branch = branches.find(b => b.id === order.branchId);
        if (!branch) return;

        order.items.forEach(item => {
            const date = new Date(order.createdAt).toISOString().split('T')[0];
            const row = `${date},${item.itemId},${item.quantity},"${branch.name}"\n`;
            csvContent += row;
        });
    });

    return csvContent;
}
