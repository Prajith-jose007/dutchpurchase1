
import type { Branch, User } from '@/lib/types';

// Branches remain as a static, hardcoded list as they are unlikely to change often.
export const branches: Branch[] = [
  { id: 'branch-6', name: 'PLAZA' },
  { id: 'branch-7', name: 'JBR' },
  { id: 'branch-8', name: 'WORLD TRADE CENTER' },
  { id: 'branch-9', name: 'PRODUCTION CITY' },
  { id: 'branch-10', name: 'ABU DHABI' },
  { id: 'branch-11', name: 'LOTUS ROYALE' },
  { id: 'branch-12', name: 'CENTRAL KITCHEN' },
  { id: 'branch-all', name: 'All Branches' }, // For users not tied to one branch
];

// All user and order data is now managed by the database via `src/lib/actions.ts`.
// This file is kept for the static `branches` data but can be refactored further if needed.

// In-memory `users` array is now removed. It's seeded into the database via `schema.sql`.
// let users: User[] = [ ... ];

// In-memory `ordersData` array is removed. It's now stored in the `orders` table.
// export let ordersData: Order[] = [ ... ];

// In-memory `allInvoiceUploads` array is removed. It's now stored in the `invoices` table.
// export let allInvoiceUploads: string[] = [ ... ];

// All data manipulation functions are now asynchronous SQL queries in `src/lib/actions.ts`.
// `saveOrder`, `updateOrder`, `getOrders`, `getOrderById`, etc., are removed from here.


