import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Order } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusBadgeVariant(status: Order['status']): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'Pending': return 'outline';
    case 'Order Received': return 'default';
    case 'Arrived': return 'secondary';
    case 'Approved': return 'default'; 
    case 'Processing': return 'default';
    case 'Shipped': return 'secondary';
    case 'Delivered': return 'default'; 
    case 'Closed': return 'default';
    case 'Cancelled': return 'destructive';
    default: return 'outline';
  }
}
