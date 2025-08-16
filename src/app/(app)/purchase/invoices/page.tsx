
// src/app/(app)/purchase/invoices/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getInvoicesAction, deleteInvoiceAction } from '@/lib/actions';
import type { Invoice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function InvoiceManagementPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const fetchedInvoices = await getInvoicesAction();
      setInvoices(fetchedInvoices);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch invoices.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && !['admin', 'superadmin', 'purchase'].includes(currentUser.role)) {
      toast({ title: "Access Denied", description: "You don't have permission to view this page.", variant: "destructive" });
      router.push('/');
      return;
    }
    if (currentUser) {
      fetchInvoices();
    }
  }, [currentUser, router]);
  
  const handleDeleteInvoice = async (invoiceId: number) => {
    const result = await deleteInvoiceAction(invoiceId);
    if(result.success) {
        toast({ title: "Invoice Deleted", description: "The invoice record has been removed." });
        await fetchInvoices();
    } else {
        toast({ title: "Error", description: result.error || "Could not delete the invoice.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Icons.Dashboard className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">Loading Invoices...</p></div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline tracking-tight">Invoice Log</h1>
          <p className="text-muted-foreground">This is a log of all individual invoice entries created when closing an order.</p>
        </div>
         <Link href="/purchase/master-invoices">
            <Button><Icons.FileText className="mr-2 h-4 w-4" /> Go to Master Invoices</Button>
        </Link>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Invoice Entries</CardTitle>
          <CardDescription>To upload a file, go to the Master Invoices page and select the corresponding consolidated invoice.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>File / Status</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                       {invoice.fileName ? (
                           <a href={`/api/invoices/${encodeURIComponent(invoice.fileName)}`} target="_blank" rel="noopener noreferrer" className="font-medium flex items-center gap-2 text-primary hover:underline">
                               <Icons.FileText className="h-4 w-4" />
                               {invoice.fileName}
                           </a>
                       ) : (
                           <Badge variant="secondary">Manual Entry - No File</Badge>
                       )}
                       {invoice.notes && <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate" title={invoice.notes}>Note: {invoice.notes}</p>}
                    </TableCell>
                    <TableCell>{invoice.uploaderName || 'N/A'}</TableCell>
                    <TableCell>{new Date(invoice.uploadedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                    <Icons.Delete className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete the invoice record for <span className="font-semibold">{invoice.invoiceNumber}</span>. This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)} className="bg-destructive hover:bg-destructive/90">Delete Invoice</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
