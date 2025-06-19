// src/lib/actions.ts
"use server";

import type { CartItem, ForecastInput, Order, OrderItem } from "@/lib/types";
import { mockBranches, mockOrders, addOrder as addMockOrder, mockUsers } from "@/data/mockData";
import { forecastDemand as callForecastDemandAI } from "@/ai/flows/demand-forecasting";
import { redirect } from "next/navigation";
import { getItemByCode } from "@/data/inventoryItems";

// Temporary in-memory storage for orders
let orders: Order[] = [...mockOrders];

export async function submitOrderAction(cartItems: CartItem[], branchId: string, userId: string): Promise<{ success: boolean; orderId?: string; error?: string }> {
  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: "Cart is empty." };
  }

  const branch = mockBranches.find(b => b.id === branchId);
  const user = mockUsers.find(u => u.id === userId);

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

    addMockOrder(newOrder); // Add to our mock data store

    // In a real app, save to database here
    console.log("Order submitted:", newOrder);

    // No direct redirect from server action if it's called from client component that handles state.
    // Instead, return success and let client handle navigation or UI update.
    return { success: true, orderId: newOrder.id };
  } catch (error) {
    console.error("Failed to submit order:", error);
    return { success: false, error: "Failed to submit order. Please try again." };
  }
}

export async function getOrdersAction(): Promise<Order[]> {
  // In a real app, fetch from database
  return Promise.resolve(mockOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
}

export async function getOrderByIdAction(orderId: string): Promise<Order | undefined> {
  return Promise.resolve(mockOrders.find(o => o.id === orderId));
}


export async function handleDemandForecastAction(input: ForecastInput) {
  try {
    // Construct historical data CSV if not directly provided
    // For this prototype, we assume `input.historicalOrderData` is already in correct CSV format
    // A more robust implementation would query orders and format them.
    
    // Example of generating CSV from mockOrders if needed:
    // const historicalDataLines = ["date,item_code,quantity,branch_name"];
    // mockOrders.forEach(order => {
    //   const branchName = mockBranches.find(b => b.id === order.branchId)?.name || order.branchId;
    //   order.items.forEach(item => {
    //     historicalDataLines.push(`${new Date(order.createdAt).toLocaleDateString('en-CA')},${item.itemId},${item.quantity},${branchName}`);
    //   });
    // });
    // const historicalCSV = historicalDataLines.join('\\n');


    if (!input.historicalOrderData.trim()) {
        return { success: false, error: "Historical order data is required." };
    }
    if (!input.forecastHorizon.trim()) {
        return { success: false, error: "Forecast horizon is required." };
    }
    if (!input.branch.trim()) {
        return { success: false, error: "Branch is required." };
    }


    const result = await callForecastDemandAI({
      historicalOrderData: input.historicalOrderData, // Ensure this is formatted as CSV string
      forecastHorizon: input.forecastHorizon,
      branch: input.branch,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in demand forecasting action:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during forecasting.";
    return { success: false, error: errorMessage };
  }
}

// Helper to create a sample CSV from current orders
export async function getSampleHistoricalDataCSVAction(): Promise<string> {
  const lines = ["date,item_code,quantity,branch_name"];
  const ordersToProcess = mockOrders.slice(0, 20); // Use recent 20 orders for sample

  ordersToProcess.forEach(order => {
    const branchName = mockBranches.find(b => b.id === order.branchId)?.name || order.branchId;
    order.items.forEach(item => {
      const inventoryItem = getItemByCode(item.itemId);
      const description = inventoryItem ? inventoryItem.description : "Unknown Item";
      // The AI prompt expects item code. Description can be added for clarity in CSV if needed by modifying the prompt/flow.
      // For now, sticking to item_code as per AI flow's likely expectation for processing.
      lines.push(`${new Date(order.createdAt).toLocaleDateString('en-CA')},${item.itemId},${item.quantity},${branchName}`);
    });
  });
  return lines.join('\n');
}
