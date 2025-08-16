

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getOrderByIdAction, updateOrderStatusAction, deleteOrderAction } from '@/lib/actions';
import type { Order, User, OrderStatus, OrderItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { branches } from '@/data/appRepository';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatQuantity } from '@/lib/formatters';
import { Input } from '@/components/ui/input';

const availableStatuses: OrderStatus[] = ['Pending', 'Order Received', 'Arrived', 'Closed', 'Cancelled'];

function getStatusBadgeVariant(status: Order['status']): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'Pending': return 'outline';
    case 'Order Received': return 'default';
    case 'Arrived': return 'secondary';
    case 'Closed': return 'default';
    case 'Cancelled': return 'destructive';
    default: return 'outline';
  }
}

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const router = useRouter();

  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for the "Close Order" dialog
  const [isCloseOrderDialogOpen, setIsCloseOrderDialogOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  const fetchOrderData = useCallback(async () => {
    try {
      const fetchedOrder = await getOrderByIdAction(orderId);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
      } else {
        toast({ title: "Order Not Found", description: "The requested order does not exist.", variant: "destructive" });
        setOrder(null);
      }
    } catch (error) {
      console.error("Failed to fetch order data:", error);
      toast({ title: "Error", description: "Failed to load order details.", variant: "destructive" });
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, toast]);

  useEffect(() => {
    if (orderId) {
      setIsLoading(true);
      fetchOrderData();
    }
  }, [orderId, fetchOrderData]);
  
  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order || !currentUser) return;

    if (newStatus === 'Closed') {
      setIsCloseOrderDialogOpen(true);
      return;
    }

    const result = await updateOrderStatusAction(order.id, newStatus, currentUser.id);
    if (result.success) {
      toast({ title: "Status Updated", description: `Order status changed to ${newStatus}.` });
      fetchOrderData(); 
    } else {
      toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    }
  };

  const handleConfirmCloseOrder = async () => {
    if (!order || !currentUser || !invoiceNumber) {
        toast({ title: "Missing Invoice Number", description: "Please provide at least one invoice number to close the order.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    const result = await updateOrderStatusAction(order.id, 'Closed', currentUser.id, {
        invoiceNumber,
        invoiceNotes,
    });

    if (result.success) {
        toast({ title: "Order Closed", description: "The order has been successfully closed and linked to the master invoice." });
        setIsCloseOrderDialogOpen(false);
        setInvoiceNumber('');
        setInvoiceNotes('');
        await fetchOrderData();
        router.push(`/purchase/master-invoices/${invoiceNumber.split(',')[0].trim()}`);
    } else {
        toast({ title: "Failed to Close Order", description: result.error, variant: "destructive" });
    }
    setIsSubmitting(false);
  }
  
  const handleDeleteOrder = async () => {
    if (!order || !currentUser) return;

    const result = await deleteOrderAction(order.id, currentUser);
    if (result.success) {
        toast({ title: "Order Deleted", description: "The purchase order has been permanently removed." });
        router.push('/purchase/notifications');
    } else {
        toast({ title: "Deletion Failed", description: result.error, variant: "destructive" });
    }
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
        <Link href="/purchase/notifications">
          <Button variant="outline">
            <Icons.ClipboardList className="mr-2 h-4 w-4" /> Back to Notifications
          </Button>
        </Link>
      </div>
    );
  }

  const branchName = branches.find(b => b.id === order.branchId)?.name || order.branchId;
  const userName = order.placingUserName || order.userId;
  const lastUpdatedByUserName = order.receivingUserName;
  const canManageOrder = currentUser && ['admin', 'superadmin', 'purchase'].includes(currentUser.role);
  const canDeleteOrder = currentUser && ['admin', 'superadmin'].includes(currentUser.role);
  const canAttachInvoices = canManageOrder;

  return (
    <>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline tracking-tight">Order Details</h1>
            <p className="text-muted-foreground">Information for order #{order.id.substring(0,8)}...</p>
          </div>
          <Link href="/purchase/notifications" className="w-full md:w-auto">
            <Button variant="outline" className="w-full md:w-auto">
              <Icons.Bell className="mr-2 h-4 w-4" /> All Notifications
            </Button>
          </Link>
        </header>

        <Card className="shadow-lg">
          <CardHeader className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <CardTitle className="text-base font-semibold text-muted-foreground">Order ID</CardTitle>
              <CardDescription className="text-lg font-mono text-foreground">{order.id}</CardDescription>
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-muted-foreground">Date Placed</CardTitle>
              <CardDescription className="text-lg text-foreground">{new Date(order.createdAt).toLocaleString()}</CardDescription>
            </div>
             <div>
              <CardTitle className="text-base font-semibold text-muted-foreground">Status</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusBadgeVariant(order.status)} className="text-base capitalize py-1 px-3">{order.status}</Badge>
                {canManageOrder && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button variant="ghost" size="icon"><Icons.Settings className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       {availableStatuses.map(status => (
                        <DropdownMenuItem key={status} onClick={() => handleStatusChange(status)} disabled={order.status === status}>
                            {status}
                        </DropdownMenuItem>
                       ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-muted-foreground">Branch</CardTitle>
              <CardDescription className="text-lg text-foreground">{branchName}</CardDescription>
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-muted-foreground">Placed By</CardTitle>
              <CardDescription className="text-lg text-foreground">{userName}</CardDescription>
            </div>
             <div>
              <CardTitle className="text-base font-semibold text-muted-foreground">Total Items</CardTitle>
              <CardDescription className="text-lg font-bold text-foreground">{order.totalItems}</CardDescription>
            </div>
            {order.invoiceNumber && (
              <div>
                  <CardTitle className="text-base font-semibold text-muted-foreground">Invoice Number(s)</CardTitle>
                  <CardDescription className="text-lg text-foreground">{order.invoiceNumber}</CardDescription>
              </div>
            )}
             {lastUpdatedByUserName && order.receivedAt && (
              <>
                <div>
                  <CardTitle className="text-base font-semibold text-muted-foreground">Last Updated By</CardTitle>
                  <CardDescription className="text-lg text-foreground">{lastUpdatedByUserName}</CardDescription>
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-muted-foreground">Last Updated At</CardTitle>
                  <CardDescription className="text-lg text-foreground">{new Date(order.receivedAt).toLocaleString()}</CardDescription>
                </div>
              </>
            )}
            {order.invoiceNotes && (
                 <div className="md:col-span-2 lg:col-span-3">
                    <CardTitle className="text-base font-semibold text-muted-foreground">Order Notes</CardTitle>
                    <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md mt-1">{order.invoiceNotes}</p>
                 </div>
            )}
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
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.itemId + '-' + item.units}>
                      <TableCell className="font-medium">{item.itemId}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-center">{formatQuantity(item.quantity, item.units)}</TableCell>
                      <TableCell className="text-right font-semibold">AED {(item.price * item.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-4">
              <div className="text-xl font-bold">
                <span>Total Order Price: </span>
                <span className="text-primary">AED {order.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
          

          <CardFooter className="border-t pt-6 flex justify-between items-center">
            <div>
            {canDeleteOrder && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Icons.Delete className="mr-2 h-4 w-4" /> Delete Order
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the purchase order
                                #{order.id.substring(0, 8)} and all its data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive hover:bg-destructive/90">
                                Yes, delete order
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            </div>
            {canAttachInvoices && (
              <Link href="/purchase/master-invoices">
                <Button>
                    <Icons.Upload className="mr-2 h-4 w-4" /> Manage Invoices
                </Button>
              </Link>
            )}
          </CardFooter>
        </Card>
      </div>

      <Dialog open={isCloseOrderDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
            setInvoiceNumber('');
            setInvoiceNotes('');
        }
        setIsCloseOrderDialogOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Close Order #{order.id.substring(0, 8)}</DialogTitle>
              <DialogDescription>Provide an invoice number. If it's a new number, a master invoice will be created. If it exists, this order will be added to it.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
               <div>
                  <Label htmlFor="invoice-number">Invoice Number (Required)</Label>
                  <Input 
                    id="invoice-number" 
                    placeholder="e.g., INV-12345"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Enter one invoice number. To link to multiple, close other orders with the same number.</p>
                </div>
                <div>
                  <Label htmlFor="invoice-notes">Notes (Optional)</Label>
                  <Textarea 
                    id="invoice-notes" 
                    placeholder="e.g., This invoice also covers other orders."
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                </div>
            </div>

            <DialogFooter className="pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsCloseOrderDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleConfirmCloseOrder} disabled={isSubmitting || !invoiceNumber}>
                  {isSubmitting ? <><Icons.Dashboard className="mr-2 h-4 w-4 animate-spin"/> Closing...</> : <><Icons.Success className="mr-2 h-4 w-4" /> Confirm & Close Order</> }
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    
