
export interface Item {
  code: string;
  remark: string | null;
  itemType: string; // This was 'type' in previous thoughts, changed to avoid conflict with TS keyword
  category: string;
  description: string;
  units: string;
  packing: number;
  shelfLifeDays: number;
}

export interface CartItem extends Item {
  quantity: number;
}

export interface OrderItem {
  itemId: string; // Corresponds to Item['code']
  description: string;
  quantity: number;
  units: string;
}

export interface Order {
  id: string;
  branchId: string;
  userId: string; // For simplicity, could be a name or ID
  createdAt: string; // ISO date string
  status: 'Pending' | 'Approved' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  items: OrderItem[];
  totalItems: number;
  // totalPrice: number; // Future enhancement
}

export interface Branch {
  id: string;
  name: string;
}

export type UserRole = 'superadmin' | 'admin' | 'purchase' | 'employee'; // Added 'employee' as a general role

export interface User {
  id: string;
  username: string; // Changed from name to username for login
  password?: string; // Added password (plain text for prototype - NOT SECURE)
  name: string; // Display name
  branchId: string;
  role: UserRole;
}
