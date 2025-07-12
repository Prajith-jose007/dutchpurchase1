
// src/app/(app)/orders/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getOrdersAction } from '@/lib/actions';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { branches, users } from '@/data/appRepository';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

function getStatusBadgeVariant(status: Order['status']): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'Pending': return 'outline';
    case 'Approved': return 'default'; 
    case 'Processing': return 'default';
    case 'Shipped': return 'secondary';
    case 'Delivered': return 'default'; 
    case 'Cancelled': return 'destructive';
    default: return 'outline';
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth(); // Get the current user

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return; // Don't fetch if no user is logged in
      }
      setIsLoading(true);
      try {
        // Pass the currentUser to the action
        const fetchedOrders = await getOrdersAction(currentUser);
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        toast({ title: "Error", description: "Could not fetch orders.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [toast, currentUser]); // Re-run when currentUser changes

  const handleExport = () => {
    toast({
      title: "Export Orders",
      description: "This feature is currently under development. Please check back later!",
      variant: "default",
    });
    // In a real app, you would implement CSV generation and download here.
    // console.log("Exporting orders:", orders); 
  };
  
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline tracking-tight">My Orders</h1>
          <p className="text-muted-foreground">View the status and details of your past and current orders.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
            <Icons.Download className="mr-2 h-4 w-4" /> Export Orders
          </Button>
          <Link href="/ordering" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Icons.Add className="mr-2 h-4 w-4" /> Create New Order
            </Button>
          </Link>
        </div>
      </header>

      {orders.length === 0 ? (
        <Card className="text-center py-10">
          <CardHeader>
            <Icons.OrderList className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4 text-xl font-semibold">No Orders Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You haven't placed any orders. Start by creating a new order.</p>
            <Link href="/ordering" className="mt-4 inline-block">
              <Button>
                <Icons.Add className="mr-2 h-4 w-4" /> Create New Order
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>A list of all your submitted purchase orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const branchName = branches.find(b => b.id === order.branchId)?.name || order.branchId;
                    const userName = users.find(u => u.id === order.userId)?.name || 'N/A';
                    return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-primary hover:underline">
                        <Link href={`/orders/${order.id}`}>{order.id.substring(0,15)}...</Link>
                      </TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{branchName}</TableCell>
                      <TableCell>{userName}</TableCell>
                      <TableCell className="text-center">{order.totalItems}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)} className="capitalize">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            View Details <Icons.ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
