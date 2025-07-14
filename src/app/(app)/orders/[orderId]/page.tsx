
"use client";

import React, { useState, useEffect } from 'react';
import { getOrderByIdAction, getUser, getRecentUploadsAction, attachInvoicesToOrderAction } from '@/lib/actions';
import type { Order, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { branches } from '@/data/appRepository';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';


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

export default function OrderDetailsPage({ params }: { params: { orderId: string } }) {
  const { currentUser } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [placingUser, setPlacingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for invoice attachment dialog
  const [isAttachInvoiceOpen, setIsAttachInvoiceOpen] = useState(false);
  const [recentUploads, setRecentUploads] = useState<string[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [isAttaching, setIsAttaching] = useState(false);

  useEffect(() => {
    const orderId = params.orderId;
    if (!orderId) return;

    const fetchOrderData = async () => {
      setIsLoading(true);
      try {
        const fetchedOrder = await getOrderByIdAction(orderId);
        if (fetchedOrder) {
          setOrder(fetchedOrder);
          const user = await getUser(fetchedOrder.userId);
          setPlacingUser(user);
        }
      } catch (error) {
        console.error("Failed to fetch order data:", error);
        setOrder(null); // Ensure no stale data is shown on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderData();
  }, [params.orderId]); // Dependency array is key to re-running on route change

  const handleOpenAttachDialog = async () => {
    const uploads = await getRecentUploadsAction();
    setRecentUploads(uploads);
    setSelectedInvoices([]);
    setIsAttachInvoiceOpen(true);
  };

  const handleAttachInvoices = async () => {
    if (!order || selectedInvoices.length === 0) return;

    setIsAttaching(true);
    const result = await attachInvoicesToOrderAction(order.id, selectedInvoices);
    setIsAttaching(false);

    if (result.success) {
      toast({ title: "Invoices Attached", description: `${selectedInvoices.length} invoice(s) have been linked to this order.` });
      // Refresh order data
      const updatedOrder = await getOrderByIdAction(order.id);
      if (updatedOrder) setOrder(updatedOrder);
      setIsAttachInvoiceOpen(false);
    } else {
      toast({ title: "Error", description: result.error || "Could not attach invoices.", variant: "destructive" });
    }
  };

  const handleInvoiceSelection = (fileName: string, checked: boolean) => {
    setSelectedInvoices(prev =>
      checked ? [...prev, fileName] : prev.filter(f => f !== fileName)
    );
  };

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg">Loading Order Details...</p>
        </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Icons.Error className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-headline mb-2">Order Not Found</h1>
        <p className="text-muted-foreground mb-6">The order you are looking for does not exist or could not be retrieved.</p>
        <Link href="/orders">
          <Button variant="outline">
            <Icons.OrderList className="mr-2 h-4 w-4" /> Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  const branchName = branches.find(b => b.id === order.branchId)?.name || order.branchId;
  const userName = placingUser?.name || order.userId;
  const canAttachInvoices = currentUser && ['admin', 'superadmin', 'purchase'].includes(currentUser.role) && ['Delivered', 'Processing'].includes(order.status);

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline tracking-tight">Order Details</h1>
            <p className="text-muted-foreground">Information for order #{order.id.substring(0,8)}...</p>
          </div>
          <Link href="/orders" className="w-full md:w-auto">
            <Button variant="outline" className="w-full md:w-auto">
              <Icons.OrderList className="mr-2 h-4 w-4" /> All Orders
            </Button>
          </Link>
        </header>

        <Card className="shadow-lg">
          <CardHeader className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Order ID</CardTitle>
              <CardDescription>{order.id}</CardDescription>
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Date Placed</CardTitle>
              <CardDescription>{new Date(order.createdAt).toLocaleString()}</CardDescription>
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Status</CardTitle>
              <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm capitalize">{order.status}</Badge>
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Branch</CardTitle>
              <CardDescription>{branchName}</CardDescription>
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Placed By</CardTitle>
              <CardDescription>{userName}</CardDescription>
            </div>
             <div>
              <CardTitle className="text-base font-semibold">Total Items</CardTitle>
              <CardDescription>{order.totalItems}</CardDescription>
            </div>
          </CardHeader>
          
          <Separator />

          <CardContent className="pt-6">
            <h3 className="text-xl font-semibold mb-4 font-headline">Items Ordered</h3>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead>Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => {
                    return (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-medium">{item.itemId}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell>{item.units}</TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          
          { (order.invoiceFileNames && order.invoiceFileNames.length > 0) && (
            <>
            <Separator />
            <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4 font-headline">Attached Invoices</h3>
                 <div className="space-y-2">
                    {order.invoiceFileNames.map(fileName => (
                        <div key={fileName} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                            <Icons.FileText className="h-5 w-5 text-muted-foreground"/>
                            <span className="text-sm font-medium">{fileName}</span>
                        </div>
                    ))}
                 </div>
            </CardContent>
            </>
          )}

          <CardFooter className="border-t pt-6 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Contact support for any questions about this order.
            </p>
            {canAttachInvoices && (
              <Button onClick={handleOpenAttachDialog}>
                  <Icons.Upload className="mr-2 h-4 w-4" /> Attach Invoices
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <Dialog open={isAttachInvoiceOpen} onOpenChange={setIsAttachInvoiceOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>Attach Invoices to Order #{order.id.substring(0, 8)}</DialogTitle>
                  <DialogDescription>
                      Select from the recently uploaded invoices to link them to this order.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-3 max-h-60 overflow-y-auto">
                  {recentUploads.length > 0 ? (
                      recentUploads.map(fileName => (
                          <div key={fileName} className="flex items-center space-x-2">
                              <Checkbox 
                                id={fileName}
                                onCheckedChange={(checked) => handleInvoiceSelection(fileName, !!checked)}
                                checked={selectedInvoices.includes(fileName)}
                              />
                              <label htmlFor={fileName} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  {fileName}
                              </label>
                          </div>
                      ))
                  ) : (
                      <p className="text-sm text-muted-foreground text-center">No recent invoices available to attach.</p>
                  )}
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAttachInvoices} disabled={isAttaching || selectedInvoices.length === 0}>
                      {isAttaching ? <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Add className="mr-2 h-4 w-4" />}
                      Attach Selected
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
