
// src/app/(app)/purchase/notifications/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOrdersAction } from '@/lib/actions';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { branches } from '@/data/appRepository';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

function getStatusBadgeVariant(status: Order['status']): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'Pending': return 'outline';
    case 'Order Received': return 'secondary';
    case 'Arrived': return 'secondary';
    case 'Closed': return 'default';
    case 'Cancelled': return 'destructive';
    default: return 'outline';
  }
}

export default function PurchaseNotificationsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser && !['purchase', 'admin', 'superadmin'].includes(currentUser.role)) {
      toast({ title: "Access Denied", description: "You don't have permission to view this page.", variant: "destructive" });
      router.push('/');
      return;
    }

    const fetchData = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const fetchedOrders = await getOrdersAction(currentUser);
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: "Error", description: "Could not fetch orders or user data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast, currentUser, router]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Purchase Order Notifications</h1>
        <p className="text-muted-foreground">Review and manage all incoming purchase orders from stores.</p>
      </header>

      {orders.length === 0 ? (
        <Card className="text-center py-10">
          <CardHeader>
            <Icons.Bell className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4 text-xl font-semibold">No Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">There are currently no new purchase orders to review.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Incoming Orders</CardTitle>
            <CardDescription>A list of all submitted purchase orders from all branches.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Placed By</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Date of Closure</TableHead>
                    <TableHead className="text-right">Total Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const branchName = branches.find(b => b.id === order.branchId)?.name || order.branchId;
                    
                    return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <Link href={`/orders/${order.id}`} className="text-primary hover:underline">{order.id.substring(0,8)}...</Link>
                      </TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{branchName}</TableCell>
                      <TableCell>{order.placingUserName || 'N/A'}</TableCell>
                      <TableCell>{order.receivingUserName || 'N/A'}</TableCell>
                      <TableCell>
                        {order.status === 'Closed' && order.receivedAt ? new Date(order.receivedAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right font-medium">AED {order.totalPrice.toFixed(2)}</TableCell>
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
