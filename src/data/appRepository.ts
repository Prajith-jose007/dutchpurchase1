
import type { Branch, User, Order, UserRole } from '@/lib/types';

export const branches: Branch[] = [
  { id: 'branch-6', name: 'PLAZA' },
  { id: 'branch-7', name: 'JBR' },
  { id: 'branch-8', name: 'WORLD TRADE CENTER' },
  { id: 'branch-9', name: 'PRODUCTION CITY' },
  { id: 'branch-10', name: 'ABU DHABI' },
];

export const users: User[] = [
  { id: 'user-superadmin', username: 'superadmin', password: 'Pass989#', name: 'Super Admin', branchId: 'branch-all', role: 'superadmin' },
  { id: 'user-admin', username: 'admin', password: 'Dutch@2025#', name: 'Admin User', branchId: 'branch-all', role: 'admin' },
  { id: 'user-purchase', username: 'purchase', password: 'Dutch@123#', name: 'Purchase User', branchId: 'branch-all', role: 'purchase' },
  { id: 'user-1', username: 'alice', name: 'Alice Smith', branchId: 'branch-6', role: 'employee', password: 'password1' }, // Example employee
  { id: 'user-2', username: 'bob', name: 'Bob Johnson', branchId: 'branch-7', role: 'employee', password: 'password2' },   // Example employee
  { id: 'user-store1', username: 'store1', password: 'Dutch@123#', name: 'Store User 1', branchId: 'branch-6', role: 'employee'},
];

// In-memory store for orders for the prototype
export let ordersData: Order[] = [
  {
    id: 'order-001',
    branchId: 'branch-6',
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
    branchId: 'branch-7',
    userId: 'user-2',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    status: 'Processing',
    items: [
      { itemId: '202', description: 'Apple Red', quantity: 20, units: 'KG' },
      { itemId: '626', description: 'Flour No.1 Maida Jenan', quantity: 1, units: 'KG' },
    ],
    totalItems: 21,
  },
    {
    id: 'order-003',
    branchId: 'branch-6',
    userId: 'user-1', // Assuming user-1 is Charlie Brown in this context
    createdAt: new Date().toISOString(),
    status: 'Pending',
    items: [
      { itemId: '140', description: 'Potato', quantity: 10, units: 'KG' },
      { itemId: '134', description: 'Onion Red', quantity: 5, units: 'KG' },
    ],
    totalItems: 15,
  }
];

export const saveOrder = (order: Order) => {
  ordersData = [order, ...ordersData];
};

export const getOrders = (): Order[] => {
  return [...ordersData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getOrderById = (orderId: string): Order | undefined => {
  return ordersData.find(o => o.id === orderId);
};

export const getUserByUsername = (username: string): User | undefined => {
  return users.find(u => u.username === username);
};

