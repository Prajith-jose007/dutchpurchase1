

export interface Item {
  code: string;
  remark: string | null;
  itemType: string; 
  category: string;
  description: string;
  detailedDescription: string | null;
  units: string;
  packing: number;
  shelfLifeDays?: number; // Made optional
  price: number;
}

export interface CartItem extends Item {
  quantity: number;
}

export interface OrderItem {
  itemId: string; // Corresponds to Item['code']
  description: string;
  quantity: number;
  units: string;
  price: number; // Price per unit at time of order
}

export type OrderStatus = 'Pending' | 'Order Received' | 'Arrived' | 'Closed' | 'Cancelled' | 'Approved' | 'Processing' | 'Shipped' | 'Delivered';

export interface Order {
  id: string;
  branchId: string;
  userId: string; 
  createdAt: string; // ISO date string
  status: OrderStatus;
  items: OrderItem[];
  totalItems: number;
  totalPrice: number;
  invoiceFileNames?: string[]; 
  receivedByUserId?: string | null;
  receivedAt?: string | null;
  placingUserName?: string; 
  receivingUserName?: string;
  lastUpdatedByUserName?: string;
  lastUpdatedAt?: string | null;
}

export interface Branch {
  id: string;
  name: string;
}

export type UserRole = 'superadmin' | 'admin' | 'purchase' | 'employee';

export interface User {
  id:string;
  username: string;
  password?: string;
  name: string; 
  branchIds: string[]; 
  role: UserRole;
}

export interface Invoice {
  fileName: string;
  orderId: string | null;
}

export interface PurchaseReportData {
  totalToday: number;
  totalThisMonth: number;
  totalThisYear: number;
  chartData: { month: string; [key: string]: any }[];
}

export interface DashboardData {
    summary: {
        totalOrdersToday: number;
        activeOrders: number;
        closedOrdersToday: number;
        pendingOrders: number;
    };
    totalPurchases: { month: string; total: number }[];
    dailyPurchases: { day: string; total: number }[];
    monthlyPurchases: { month: string; total: number }[];
    storePurchases: { name: string; value: number }[];
}
