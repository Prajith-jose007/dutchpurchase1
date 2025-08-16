
// src/app/(app)/purchase/master-invoices/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getMasterInvoicesAction } from '@/lib/actions';
import type { MasterInvoice } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const formatCurrency = (value: number) => `AED ${value.toFixed(2)}`;

export default function MasterInvoicesPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [masterInvoices, setMasterInvoices] = useState<MasterInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser && !['admin', 'superadmin', 'purchase'].includes(currentUser.role)) {
      toast({ title: "Access Denied", description: "You don't have permission to view this page.", variant: "destructive" });
      router.push('/');
      return;
    }
    if (currentUser) {
      setIsLoading(true);
      getMasterInvoicesAction()
        .then(setMasterInvoices)
        .catch(() => toast({ title: "Error", description: "Failed to fetch master invoices.", variant: "destructive" }))
        .finally(() => setIsLoading(false));
    }
  }, [currentUser, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Master Invoices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Master Invoices</h1>
        <p className="text-muted-foreground">View and manage consolidated invoices from vendors.</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Master Invoices</CardTitle>
          <CardDescription>Each row represents a unique invoice number consolidating one or more orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>File Status</TableHead>
                  <TableHead>Linked Orders</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masterInvoices.length > 0 ? masterInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-medium">
                      <Link href={`/purchase/master-invoices/${invoice.invoiceNumber}`} className="text-primary hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.fileName ? 'default' : 'secondary'}>
                        {invoice.fileName ? 'File Attached' : 'Pending Upload'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{invoice.orderCount}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(invoice.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                       <Link href={`/purchase/master-invoices/${invoice.invoiceNumber}`}>
                          <Button variant="outline" size="sm">
                            View Details <Icons.ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      No master invoices found. Close an order with an invoice number to create one.
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
