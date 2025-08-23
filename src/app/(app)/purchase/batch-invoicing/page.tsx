// src/app/(app)/purchase/batch-invoicing/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getOrdersForBatchClosingAction, batchCloseOrdersAction, getItemsAction } from '@/lib/actions';
import type { Order, Item } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useDropzone } from 'react-dropzone';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { getItemTypes } from '@/data/inventoryItems';


const formatCurrency = (value: number | string | null | undefined) => {
  const numValue = Number(value);
  return isNaN(numValue) ? 'AED 0.00' : `AED ${numValue.toFixed(2)}`;
};

export default function BatchInvoicingPage() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [itemTypes, setItemTypes] = useState<string[]>([]);

    // Filter states
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedStatus, setSelectedStatus] = useState<'Pending' | 'Order Received' | 'All'>('All');
    const [selectedItemType, setSelectedItemType] = useState<string>('All');
    
    // Dialog states
    const [isClosingDialogOpen, setIsClosingDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceNotes, setInvoiceNotes] = useState('');
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

    const fetchOrders = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const fetchedOrders = await getOrdersForBatchClosingAction(
                format(selectedDate, 'yyyy-MM-dd'),
                selectedStatus,
                selectedItemType
            );
            setOrders(fetchedOrders);
            setSelectedOrderIds(new Set()); // Reset selection on fetch
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to fetch orders for batch closing.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, selectedDate, selectedStatus, selectedItemType, toast]);

    useEffect(() => {
        if (currentUser) {
            if (!['admin', 'superadmin', 'purchase'].includes(currentUser.role)) {
                toast({ title: 'Access Denied', description: 'You do not have permission.', variant: 'destructive' });
                router.push('/');
                return;
            }
            
            // Fetch item types for the filter dropdown
            getItemsAction().then(items => {
                const types = getItemTypes(items);
                setItemTypes(types);
            });

            fetchOrders();
        }
    }, [currentUser, fetchOrders, router, toast]);

    const handleSelectOrder = (orderId: string) => {
        setSelectedOrderIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };
    
    const onDrop = (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) setInvoiceFile(acceptedFiles[0]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: { 'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'], 'application/pdf': ['.pdf'] }, multiple: false,
    });
    
    const handleBatchClose = async () => {
        if (!invoiceNumber) {
            toast({ title: "Validation Error", description: "Invoice number is required.", variant: "destructive" });
            return;
        }
        if (selectedOrderIds.size === 0) {
            toast({ title: "Validation Error", description: "No orders selected.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('orderIds', JSON.stringify(Array.from(selectedOrderIds)));
        formData.append('invoiceNumber', invoiceNumber);
        formData.append('invoiceNotes', invoiceNotes);
        if (invoiceFile) formData.append('invoiceFile', invoiceFile);
        if(currentUser) formData.append('userId', currentUser.id);

        const result = await batchCloseOrdersAction(formData);
        
        setIsSubmitting(false);
        if (result.success) {
            toast({ title: "Success", description: `${result.count} orders have been closed and linked.` });
            setIsClosingDialogOpen(false);
            setInvoiceFile(null);
            setInvoiceNumber('');
            setInvoiceNotes('');
            await fetchOrders();
        } else {
            toast({ title: "Error", description: result.error || "An unknown error occurred.", variant: "destructive" });
        }
    }
    
    const totalSelectedAmount = useMemo(() => {
        return orders
            .filter(o => selectedOrderIds.has(o.id))
            .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    }, [orders, selectedOrderIds]);

    return (
        <>
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-headline tracking-tight">Batch Invoice Closing</h1>
                <p className="text-muted-foreground">Select orders from a specific day to close them with a single invoice.</p>
            </header>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Filter Orders</CardTitle>
                    <div className="flex flex-col md:flex-row gap-4 pt-4">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className="w-full md:w-[280px] justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Select value={selectedStatus} onValueChange={(val: any) => setSelectedStatus(val)}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Statuses</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Order Received">Order Received</SelectItem>
                            </SelectContent>
                        </Select>
                         <Select value={selectedItemType} onValueChange={(val: any) => setSelectedItemType(val)}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Select Item Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Item Types</SelectItem>
                                {itemTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={fetchOrders} disabled={isLoading}>
                            {isLoading ? <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Search className="mr-2 h-4 w-4" />}
                            Apply Filters
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-end mb-4">
                        {selectedOrderIds.size > 0 && (
                             <Button onClick={() => setIsClosingDialogOpen(true)}>
                                <Icons.Success className="mr-2 h-4 w-4" />
                                Close {selectedOrderIds.size} Selected Order(s)
                            </Button>
                        )}
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px] text-center"><Icons.Batch className="h-5 w-5 mx-auto" /></TableHead>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Placed By</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                               {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center"><Icons.Dashboard className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                                ) : orders.length > 0 ? (
                                    orders.map(order => (
                                        <TableRow key={order.id} data-state={selectedOrderIds.has(order.id) && "selected"}>
                                            <TableCell className="text-center">
                                                <Checkbox checked={selectedOrderIds.has(order.id)} onCheckedChange={() => handleSelectOrder(order.id)} id={`select-${order.id}`} />
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline">{order.id.substring(0, 8)}...</Link>
                                            </TableCell>
                                            <TableCell>{order.placingUser?.branchName || 'N/A'}</TableCell>
                                            <TableCell>{order.placingUserName}</TableCell>
                                            <TableCell>{order.status}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(order.totalPrice)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No orders found for the selected criteria.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <Dialog open={isClosingDialogOpen} onOpenChange={setIsClosingDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Batch Close {selectedOrderIds.size} Orders</DialogTitle>
                    <DialogDescription>
                        Provide a single invoice number and optionally upload the invoice file for the selected orders.
                        The total value of selected orders is <span className="font-bold text-primary">{formatCurrency(totalSelectedAmount)}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="invoice-number">Invoice Number (Required)</Label>
                        <Input id="invoice-number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g., INV-123-ABC" />
                    </div>
                    <div>
                        <Label htmlFor="invoice-notes">Notes (Optional)</Label>
                        <Textarea id="invoice-notes" value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} placeholder="Add any relevant notes for this batch..." />
                    </div>
                    <div>
                        <Label>Invoice File (Optional)</Label>
                        <div {...getRootProps()} className={`mt-1 p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/70'}`}>
                            <input {...getInputProps()} />
                            <Icons.Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                            {invoiceFile ? (<p className="font-semibold text-primary">{invoiceFile.name}</p>) : 
                                isDragActive ? (<p>Drop file here...</p>) : 
                                (<p className="text-xs text-muted-foreground">Drag & drop a file, or click to select</p>)}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                    <Button onClick={handleBatchClose} disabled={isSubmitting || !invoiceNumber || selectedOrderIds.size === 0}>
                        {isSubmitting ? <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Success className="mr-2 h-4 w-4" />}
                        Confirm & Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
