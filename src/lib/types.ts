

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
  invoiceNumber?: string | null;
  invoiceFileNames?: string[] | null; // Added for multiple files
  invoiceNotes?: string | null;
  receivedByUserId?: string | null;
  receivedAt?: string | null;
  placingUserName?: string; 
  receivingUserName?: string;
  lastUpdatedByUserName?: string;
  lastUpdatedAt?: string | null;
  placingUser?: {
    branchName?: string;
  };
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
  id: number;
  invoiceNumber: string;
  fileName: string | null;
  notes?: string | null;
  uploadedAt: string;
  uploaderName?: string;
}

export interface MasterInvoice {
    id: number;
    invoiceNumber: string;
    fileName: string | null;
    notes: string | null;
    createdAt: string;
    uploaderName: string | null;
    orderCount: number;
    totalAmount: number;
}

export interface MasterInvoiceDetails extends MasterInvoice {
    orders: Order[];
    consolidatedItems: OrderItem[];
    involvedBranches: string[];
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
