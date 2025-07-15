
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getOrderByIdAction, getUser, getRecentUploadsAction, attachInvoicesToOrderAction, updateOrderStatusAction, uploadInvoicesAction } from '@/lib/actions';
import type { Order, User, OrderStatus } from '@/lib/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDropzone } from 'react-dropzone';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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

export default function OrderDetailsPage({ params }: { params: { orderId: string } }) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [placingUser, setPlacingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for invoice attachment dialog
  const [isAttachInvoiceOpen, setIsAttachInvoiceOpen] = useState(false);
  const [recentUploads, setRecentUploads] = useState<string[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [isAttaching, setIsAttaching] = useState(false);
  
  // State for camera capture
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const fetchOrderData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedOrder = await getOrderByIdAction(params.orderId);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
        const user = await getUser(fetchedOrder.userId);
        setPlacingUser(user);
      }
    } catch (error) {
      console.error("Failed to fetch order data:", error);
      toast({ title: "Error", description: "Failed to load order details.", variant: "destructive" });
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, [params.orderId, toast]);

  useEffect(() => {
    if (params.orderId) {
      fetchOrderData();
    }
  }, [params.orderId, fetchOrderData]);
  
  // Camera permission logic
  useEffect(() => {
    if (isAttachInvoiceOpen) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
        }
      };
      getCameraPermission();
    } else {
        // Stop camera stream when dialog closes
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }
  }, [isAttachInvoiceOpen]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    const result = await updateOrderStatusAction(order.id, newStatus);
    if (result.success) {
      toast({ title: "Status Updated", description: `Order status changed to ${newStatus}.` });
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      if (newStatus === 'Closed') {
        handleOpenAttachDialog();
      }
    } else {
      toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    }
  };

  const handleOpenAttachDialog = async () => {
    const uploads = await getRecentUploadsAction();
    setRecentUploads(uploads);
    setSelectedInvoices([]);
    setCapturedImage(null);
    setIsAttachInvoiceOpen(true);
  };

  const handleAttachInvoices = async () => {
    if (!order) return;
    
    let invoicesToAttach = [...selectedInvoices];
    setIsAttaching(true);

    if (capturedImage && currentUser) {
      try {
        const blob = await (await fetch(capturedImage)).blob();
        const fileName = `capture-${order.id}-${Date.now()}.png`;
        const capturedFile = new File([blob], fileName, { type: 'image/png' });

        const formData = new FormData();
        formData.append('invoices', capturedFile);
        formData.append('userId', currentUser.id);

        const uploadResult = await uploadInvoicesAction(formData);
        if (uploadResult.success) {
            invoicesToAttach.push(fileName);
        } else {
             toast({ title: "Capture Upload Failed", description: uploadResult.error, variant: "destructive" });
        }
      } catch(e) {
         toast({ title: "Capture Error", description: "Could not process captured image.", variant: "destructive" });
      }
    }

    if (invoicesToAttach.length > 0) {
        const result = await attachInvoicesToOrderAction(order.id, invoicesToAttach);
        if (result.success) {
            toast({ title: "Invoices Attached", description: `${invoicesToAttach.length} invoice(s) have been linked.` });
            fetchOrderData(); // Refresh order data
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    }
    
    setIsAttaching(false);
    setIsAttachInvoiceOpen(false);
  };
  
  const handleCaptureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        setCapturedImage(canvas.toDataURL('image/png'));
      }
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
  const canManageOrder = currentUser && ['admin', 'superadmin', 'purchase'].includes(currentUser.role);
  const canAttachInvoices = canManageOrder && ['Arrived', 'Closed'].includes(order.status);

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
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
              <div className="flex items-center gap-2">
                <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm capitalize">{order.status}</Badge>
                {canManageOrder && order.status !== 'Closed' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-6 w-6"><Icons.Settings className="h-4 w-4" /></Button>
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
                  {order.items.map((item) => (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-medium">{item.itemId}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell>{item.units}</TableCell>
                    </TableRow>
                  ))}
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
              <Button 
                onClick={handleOpenAttachDialog}
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
            <DialogDescription>Attach existing uploads or capture a new invoice image.</DialogDescription>
          </DialogHeader>
            <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Select Upload</TabsTrigger>
                    <TabsTrigger value="capture">Capture Image</TabsTrigger>
                </TabsList>
                <TabsContent value="upload">
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
                            <p className="text-sm text-muted-foreground text-center py-4">No recent invoices available to attach.</p>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="capture">
                   <div className="py-4 space-y-4">
                      {capturedImage ? (
                          <div className="space-y-4">
                              <Image src={capturedImage} alt="Captured Invoice" width={400} height={300} className="rounded-md mx-auto" />
                              <Button variant="outline" onClick={() => setCapturedImage(null)} className="w-full">
                                <Icons.Remove className="mr-2 h-4 w-4" /> Retake
                              </Button>
                          </div>
                      ) : (
                        <>
                          <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden">
                              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                              {hasCameraPermission === false && (
                                <div className="absolute inset-0 flex items-center justify-center p-4">
                                  <Alert variant="destructive">
                                    <AlertTitle>Camera Access Required</AlertTitle>
                                    <AlertDescription>Please allow camera access to use this feature.</AlertDescription>
                                  </Alert>
                                </div>
                              )}
                          </div>
                          <Button onClick={handleCaptureImage} disabled={!hasCameraPermission} className="w-full">
                              <Icons.Camera className="mr-2 h-4 w-4" /> Capture Invoice
                          </Button>
                        </>
                      )}
                      <canvas ref={canvasRef} className="hidden"></canvas>
                   </div>
                </TabsContent>
            </Tabs>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button 
              onClick={handleAttachInvoices} 
              disabled={isAttaching || (selectedInvoices.length === 0 && !capturedImage)}
              className={cn(
                  currentUser?.role === 'purchase'
                    ? "bg-blue-600 hover:bg-blue-700"
                    : ""
                )}
            >
              {isAttaching ? <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Add className="mr-2 h-4 w-4" />}
              Attach Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
