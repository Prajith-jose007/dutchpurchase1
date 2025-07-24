// src/app/(app)/admin/reports/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getOrdersAction } from '@/lib/actions';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { branches } from '@/data/appRepository';

export default function ReportsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser && !['admin', 'superadmin'].includes(currentUser.role)) {
      toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
      router.push('/');
      return;
    }

    const fetchData = async () => {
      if (currentUser) {
        try {
          const fetchedOrders = await getOrdersAction(currentUser);
          setOrders(fetchedOrders);
        } catch (error) {
          toast({ title: "Error", description: "Failed to fetch report data.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      } else {
        router.push('/login');
      }
    };

    if (currentUser) {
      fetchData();
    } else if(!isLoading) {
      router.push('/login');
    }
  }, [currentUser, router, isLoading]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const monthlyOrders = useMemo(() => 
    orders.filter(o => new Date(o.createdAt) >= startOfMonth),
    [orders]
  );
  
  const closedOrders = useMemo(() => 
    orders.filter(o => o.status === 'Closed'),
    [orders]
  );

  const monthlyItemsPurchased = monthlyOrders.reduce((acc, order) => acc + order.totalItems, 0);
  
  const getBranchName = (branchId: string) => branches.find(b => b.id === branchId)?.name || branchId;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Reports...</p>
      </div>
    );
  }
  
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role)) {
    return null; // Render nothing while redirecting
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Admin Reports</h1>
        <p className="text-muted-foreground">View monthly summaries and all closed orders.</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle>Monthly Purchase Summary</CardTitle>
            <CardDescription>Report for the current month: {now.toLocaleString('default', { month: 'long', year: 'numeric' })}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Total Orders This Month</p>
                <p className="text-2xl font-bold">{monthlyOrders.length}</p>
            </div>
            <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Total Items Purchased This Month</p>
                <p className="text-2xl font-bold">{monthlyItemsPurchased}</p>
            </div>
        </CardContent>
      </Card>
      
      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Closed Orders Report</CardTitle>
          <CardDescription>A complete log of all fulfilled and closed orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Placed By</TableHead>
                  <TableHead>Closed By</TableHead>
                  <TableHead>Closed On</TableHead>
                  <TableHead>Attachments</TableHead>
                  <TableHead className="text-right">Total Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedOrders.length > 0 ? closedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                       <Link href={`/orders/${order.id}`} className="text-primary hover:underline flex items-center gap-2">
                            <Icons.ClipboardList className="h-4 w-4" />
                            {`#${order.id.substring(0,8)}...`}
                        </Link>
                    </TableCell>
                    <TableCell>{getBranchName(order.branchId)}</TableCell>
                    <TableCell>{order.placingUserName || 'N/A'}</TableCell>
                    <TableCell>{order.receivingUserName || 'N/A'}</TableCell>
                    <TableCell>{order.receivedAt ? new Date(order.receivedAt).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={order.invoiceFileNames && order.invoiceFileNames.length > 0 ? 'default' : 'secondary'}>
                        {order.invoiceFileNames?.length || 0} file(s)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">AED {order.totalPrice.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                        There are no closed orders yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
