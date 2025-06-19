
import type { Branch, User, Order } from '@/lib/types';

export const mockBranches: Branch[] = [
  { id: 'branch-1', name: 'Downtown Central Kitchen' },
  { id: 'branch-2', name: 'Northside Express' },
  { id: 'branch-3', name: 'West End Cafe' },
  { id: 'branch-4', name: 'South Bay Bistro' },
  { id: 'branch-5', name: 'Eastville Diner' },
  { id: 'branch-6', name: 'PLAZA' },
  { id: 'branch-7', name: 'JBR' },
  { id: 'branch-8', name: 'WORLD TRADE CENTER' },
  { id: 'branch-9', name: 'PRODUCTION CITY' },
  { id: 'branch-10', name: 'ABU DHABI' },
];

export const mockUsers: User[] = [
  { id: 'user-1', name: 'Alice Smith', branchId: 'branch-1' },
  { id: 'user-2', name: 'Bob Johnson', branchId: 'branch-2' },
  { id: 'user-3', name: 'Charlie Brown', branchId: 'branch-1' },
  { id: 'user-4', name: 'Diana Prince', branchId: 'branch-3' },
];

// In-memory store for orders for the prototype
export let mockOrders: Order[] = [
  {
    id: 'order-001',
    branchId: 'branch-1',
    userId: 'user-1',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: 'Delivered',
    items: [
      { itemId: '101', description: 'Baby Corn', quantity: 5, units: 'KG' },
      { itemId: '306', description: 'Chicken 1200gms', quantity: 10, units: 'KG' },
    ],
    totalItems: 15,
  },
  {
    id: 'order-002',
    branchId: 'branch-2',
    userId: 'user-2',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    status: 'Processing',
    items: [
      { itemId: '202', description: 'Apple Red', quantity: 20, units: 'KG' },
      { itemId: '626', description: 'Flour No.1 Maida Jenan', quantity: 1, units: 'KG' }, // Assuming PACKING for 626 is 50, so 1 means 1 bag of 50kg
    ],
    totalItems: 21, // This should be quantity sum
  },
    {
    id: 'order-003',
    branchId: 'branch-1',
    userId: 'user-3',
    createdAt: new Date().toISOString(),
    status: 'Pending',
    items: [
      { itemId: '140', description: 'Potato', quantity: 10, units: 'KG' },
      { itemId: '134', description: 'Onion Red', quantity: 5, units: 'KG' },
    ],
    totalItems: 15,
  }
];

export const addOrder = (order: Order) => {
  mockOrders = [order, ...mockOrders];
};
