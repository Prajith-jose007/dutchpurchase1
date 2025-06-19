// src/lib/actions.ts
"use server";

import type { CartItem, Order, OrderItem } from "@/lib/types";
import { mockBranches, mockOrders, addOrder as addMockOrder, mockUsers } from "@/data/mockData";
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
