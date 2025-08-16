// src/app/(app)/purchase/master-invoices/[invoiceNumber]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { getMasterInvoiceDetailsAction, uploadMasterInvoiceAction } from '@/lib/actions';
import type { MasterInvoiceDetails, OrderItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { formatQuantity } from '@/lib/formatters';
import { branches } from '@/data/appRepository';

const formatCurrency = (value: number | string | null | undefined) => {
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return 'AED 0.00';
  }
  return `AED ${numValue.toFixed(2)}`;
};

const UploadZone = ({ masterInvoiceId, onUploadSuccess }: { masterInvoiceId: number; onUploadSuccess: () => void; }) => {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'], 'application/pdf': ['.pdf'] },
        multiple: false,
    });

    const handleUpload = async () => {
        if (!file || !currentUser) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('invoiceFile', file);
        formData.append('masterInvoiceId', masterInvoiceId.toString());
        formData.append('userId', currentUser.id);

        const result = await uploadMasterInvoiceAction(formData);
        if (result.success) {
            toast({ title: "Upload Successful", description: "The master invoice file has been attached." });
            onUploadSuccess();
        } else {
            toast({ title: "Upload Failed", description: result.error, variant: "destructive" });
        }
        setIsUploading(false);
    };

    return (
        <Card className="mt-6 bg-muted/50">
            <CardHeader>
                <CardTitle>Upload Master Invoice File</CardTitle>
                <CardDescription>Attach the physical invoice document here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/70'}`}>
                    <input {...getInputProps()} />
                    <Icons.Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    {file ? (
                        <p className="font-semibold text-primary">{file.name}</p>
                    ) : isDragActive ? (
                        <p className="font-semibold text-primary">Drop the file here...</p>
                    ) : (
                        <p className="text-muted-foreground">Drag & drop a file here, or click to select</p>
                    )}
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleUpload} disabled={!file || isUploading}>
                    {isUploading ? <><Icons.Dashboard className="mr-2 h-4 w-4 animate-spin"/> Uploading...</> : <><Icons.UploadCloud className="mr-2 h-4 w-4" /> Upload and Attach File</>}
                </Button>
            </CardFooter>
        </Card>
    )
}

export default function MasterInvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const invoiceNumber = params.invoiceNumber as string;
  const [details, setDetails] = useState<MasterInvoiceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMasterInvoiceDetailsAction(invoiceNumber);
      if (!data) {
        toast({ title: "Not Found", description: "Could not find a master invoice with that number.", variant: "destructive" });
        router.push('/purchase/master-invoices');
      } else {
        setDetails(data);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch invoice details.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [invoiceNumber, router, toast]);

  useEffect(() => {
    if (currentUser) {
      fetchDetails();
    }
  }, [currentUser, fetchDetails]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Invoice Details...</p>
      </div>
    );
  }

  if (!details) {
    return null; 
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline tracking-tight">Master Invoice: {details.invoiceNumber}</h1>
          <p className="text-muted-foreground">Created on {new Date(details.createdAt).toLocaleDateString()}</p>
        </div>
        <Link href="/purchase/master-invoices">
            <Button variant="outline"><Icons.ChevronRight className="mr-2 h-4 w-4 transform rotate-180" /> Back to All Invoices</Button>
        </Link>
      </header>
      
      <Card>
        <CardHeader>
            <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(details.totalAmount)}</p>
            </div>
            <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Linked Orders</p>
                <p className="text-2xl font-bold">{details.orderCount}</p>
            </div>
             <div className="p-4 border rounded-lg md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Involved Stores</p>
                <div className="flex flex-wrap gap-2 mt-2">
                    {details.involvedBranches.map(branch => <Badge key={branch} variant="secondary">{branch}</Badge>)}
                </div>
            </div>
        </CardContent>
        {details.fileName && (
             <CardFooter>
                <a href={`/api/invoices/${encodeURIComponent(details.fileName)}`} target="_blank" rel="noopener noreferrer">
                    <Button><Icons.FileText className="mr-2 h-4 w-4" /> View Attached Invoice File</Button>
                </a>
            </CardFooter>
        )}
      </Card>
      
       {!details.fileName && <UploadZone masterInvoiceId={details.id} onUploadSuccess={fetchDetails} />}

      <Card>
        <CardHeader>
            <CardTitle>Consolidated Item List</CardTitle>
            <CardDescription>A complete list of all items from all linked orders.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="overflow-x-auto border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item Code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-center">Total Quantity</TableHead>
                            <TableHead className="text-right">Total Value</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {details.consolidatedItems.map(item => (
                             <TableRow key={item.itemId}>
                                <TableCell className="font-mono">{item.itemId}</TableCell>
                                <TableCell>{item.description}</TableCell>
                                <TableCell className="text-center">{formatQuantity(item.quantity, item.units)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(Number(item.quantity) * Number(item.price))}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Linked Purchase Orders</CardTitle>
            <CardDescription>All individual purchase orders linked to this master invoice.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Placed By</TableHead>
                             <TableHead>Date Placed</TableHead>
                            <TableHead className="text-right">Order Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {details.orders.map(order => (
                             <TableRow key={order.id}>
                                <TableCell>
                                    <Link href={`/orders/${order.id}`} className="text-primary hover:underline font-medium">
                                        {order.id.substring(0, 15)}...
                                    </Link>
                                </TableCell>
                                <TableCell>{branches.find(b => b.id === order.branchId)?.name || order.branchId}</TableCell>
                                <TableCell>{order.placingUserName}</TableCell>
                                 <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(order.totalPrice)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
