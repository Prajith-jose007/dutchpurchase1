
// src/app/(app)/admin/reports/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getOrdersAction, getInvoicesAction } from '@/lib/actions';
import type { Order, User, Invoice } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export default function ReportsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Protect the route for admin/superadmin only
    if (currentUser && !['admin', 'superadmin'].includes(currentUser.role)) {
      toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
      router.push('/');
      return;
    }

    const fetchData = async () => {
      if (currentUser) {
        try {
          // Await both promises together for efficiency
          const [fetchedOrders, fetchedInvoices] = await Promise.all([
            getOrdersAction(currentUser),
            getInvoicesAction()
          ]);
          setOrders(fetchedOrders);
          setInvoices(fetchedInvoices);
        } catch (error) {
          toast({ title: "Error", description: "Failed to fetch report data.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      } else {
        // If no user is logged in after checking, redirect.
        router.push('/');
      }
    };

    // Only run fetch logic if we have a user or are still in the initial loading state.
    if (currentUser) {
      fetchData();
    } else if(!isLoading) {
      // If loading is finished and there's no user, redirect away.
      router.push('/login');
    }
  }, [currentUser, router, isLoading]);

  // Calculate monthly summary
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyOrders = orders.filter(o => new Date(o.createdAt) >= startOfMonth);
  const monthlyItemsPurchased = monthlyOrders.reduce((acc, order) => acc + order.totalItems, 0);

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
        <p className="text-muted-foreground">View monthly summaries and all uploaded invoices.</p>
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
          <CardTitle>All Uploaded Invoices</CardTitle>
          <CardDescription>A complete log of all invoices uploaded to the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Filename</TableHead>
                  <TableHead>Attached to Order</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length > 0 ? invoices.map((invoice) => (
                  <TableRow key={invoice.fileName}>
                    <TableCell className="font-medium">
                      <a 
                        href={`/api/invoices/${encodeURIComponent(invoice.fileName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Icons.FileText className="h-4 w-4" />
                        {invoice.fileName}
                      </a>
                    </TableCell>
                    <TableCell>
                      {invoice.orderId ? (
                        <Link href={`/orders/${invoice.orderId}`} className="text-primary hover:underline">
                            {`#${invoice.orderId.substring(0,8)}...`}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={invoice.orderId ? 'default' : 'secondary'}>
                        {invoice.orderId ? 'Attached' : 'Unattached'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                        No invoices have been uploaded yet.
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
