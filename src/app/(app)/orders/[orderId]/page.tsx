
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getOrderByIdAction, getUser, updateOrderStatusAction, deleteOrderAction, uploadInvoicesAction } from '@/lib/actions';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDropzone } from 'react-dropzone';


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

// Helper to format quantity for display
const formatQuantity = (item: OrderItem) => {
    const { quantity, units } = item;
    if (units.toUpperCase() === 'KG') {
        if (quantity < 1 && quantity > 0) {
            // Convert to grams if less than 1 KG
            return `${Math.round(quantity * 1000)}g`;
        }
        // Show up to 3 decimal places for KG if needed
        return `${parseFloat(quantity.toFixed(3))} KG`;
    }
    // For other units (like PCS), show as a whole number
    return `${Math.round(quantity)} ${units}`;
};


export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const router = useRouter();

  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [placingUser, setPlacingUser] = useState<User | null>(null);
  const [lastUpdatedByUser, setLastUpdatedByUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for invoice attachment dialog
  const [isAttachInvoiceOpen, setIsAttachInvoiceOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchOrderData = useCallback(async () => {
    try {
      const fetchedOrder = await getOrderByIdAction(orderId);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
        const [pUser, luUser] = await Promise.all([
          getUser(fetchedOrder.userId),
          getUser(fetchedOrder.receivedByUserId || '')
        ]);
        setPlacingUser(pUser);
        setLastUpdatedByUser(luUser);
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
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !currentUser || !order) return;
    setIsUploading(true);

    const formData = new FormData();
    acceptedFiles.forEach(file => {
      formData.append('invoices', file);
    });
    formData.append('userId', currentUser.id);
    formData.append('orderId', order.id); // Directly associate with the current order

    try {
      const result = await uploadInvoicesAction(formData);
      if (result.success && result.fileCount && result.fileCount > 0) {
        toast({ title: "Upload Successful", description: `${result.fileCount} invoice(s) have been attached to this order.` });
        setIsAttachInvoiceOpen(false); // Close dialog on success
        fetchOrderData(); // Refresh order data to show new attachments
      } else {
        toast({ title: "Upload Failed", description: result.error || "Could not upload and attach files.", variant: "destructive" });
      }
    } catch (error) {
       toast({ title: "Upload Error", description: "An error occurred during upload.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [currentUser, order, toast, fetchOrderData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png']} });

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order || !currentUser) return;
    const result = await updateOrderStatusAction(order.id, newStatus, currentUser.id);
    if (result.success) {
      toast({ title: "Status Updated", description: `Order status changed to ${newStatus}.` });
      fetchOrderData(); // Refetch to get updated receiver info
      if (newStatus === 'Closed' && (!order.invoiceFileNames || order.invoiceFileNames.length === 0)) {
        setIsAttachInvoiceOpen(true);
      }
    } else {
      toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    }
  };
  
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
  const userName = placingUser?.name || order.userId;
  const lastUpdatedByUserName = lastUpdatedByUser?.name;
  const canManageOrder = currentUser && ['admin', 'superadmin', 'purchase'].includes(currentUser.role);
  const canDeleteOrder = currentUser && ['admin', 'superadmin'].includes(currentUser.role);
  const canAttachInvoices = canManageOrder && ['Arrived', 'Closed'].includes(order.status);

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
                    <TableRow key={item.itemId}>
                      <TableCell className="font-medium">{item.itemId}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-center">{formatQuantity(item)}</TableCell>
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
          
          { (order.invoiceFileNames && order.invoiceFileNames.length > 0) && (
            <>
            <Separator />
            <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4 font-headline">Attached Invoices</h3>
                 <div className="space-y-2">
                    {order.invoiceFileNames.map(fileName => (
                      <a 
                        key={fileName}
                        href={`/api/invoices/${encodeURIComponent(fileName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 border rounded-md bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <Icons.FileText className="h-5 w-5 text-muted-foreground"/>
                        <span className="text-sm font-medium text-primary hover:underline">{fileName}</span>
                      </a>
                    ))}
                 </div>
            </CardContent>
            </>
          )}

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
              <Button 
                onClick={() => setIsAttachInvoiceOpen(true)}
                className={cn(
                  currentUser?.role === 'purchase'
                    ? "bg-blue-600 hover:bg-blue-700"
                    : ""
                )}
              >
                  <Icons.Upload className="mr-2 h-4 w-4" /> Attach Invoices
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <Dialog open={isAttachInvoiceOpen} onOpenChange={setIsAttachInvoiceOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Attach Invoices to Order #{order.id.substring(0, 8)}</DialogTitle>
              <DialogDescription>Upload one or more invoice files (PDF, JPG, PNG). They will be directly attached to this order.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
                <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/70'}`}>
                    <input {...getInputProps()} disabled={isUploading} />
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                           <Icons.Dashboard className="h-8 w-8 animate-spin text-primary" />
                           <p>Uploading & Attaching...</p>
                        </div>
                    ) : isDragActive ? (
                        <p className="font-semibold text-primary">Drop files here...</p>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Icons.UploadCloud className="h-8 w-8" />
                            <p>Drag & drop or click to upload</p>
                        </div>
                    )}
                </div>
            </div>

            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary" disabled={isUploading}>Cancel</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    