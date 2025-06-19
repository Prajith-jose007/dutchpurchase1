export interface Item {
  code: string;
  remark: string | null;
  itemType: string; // This was 'type' in previous thoughts, changed to avoid conflict with TS keyword
  category: string;
  description: string;
  units: string;
  packing: number;
  shelfLifeDays: number;
  imageUrl?: string; // Optional image URL
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

export interface User {
  id: string;
  name: string;
  branchId: string;
  // role: 'employee' | 'purchaser' | 'admin'; // Future enhancement
}

export interface ForecastInput {
  historicalOrderData: string; // CSV format
  forecastHorizon: string;
  branch: string;
}

export interface ForecastResult {
  forecastedDemand: string;
  confidenceLevel: string;
  recommendations: string;
}
