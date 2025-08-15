// src/app/(app)/purchase/invoices/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getInvoicesAction, uploadInvoicesAction, deleteInvoiceAction } from '@/lib/actions';
import type { Invoice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const uploadSchema = z.object({
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export default function InvoiceManagementPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { invoiceNumber: '', notes: '' },
  });

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFilesToUpload(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleUploadSubmit = async (data: UploadFormData) => {
    if (!filesToUpload.length || !currentUser) {
      toast({ title: "No Files", description: "Please select at least one file to upload.", variant: "destructive" });
      return;
    }
    setIsUploading(true);

    const formData = new FormData();
    filesToUpload.forEach(file => formData.append('invoices', file));
    formData.append('userId', currentUser.id);
    if (data.invoiceNumber) {
      formData.append('invoiceNumber', data.invoiceNumber);
    }
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    const result = await uploadInvoicesAction(formData);

    if (result.success) {
      toast({ title: "Upload Successful", description: `${result.count} invoice(s) processed.` });
      form.reset();
      setFilesToUpload([]);
      await fetchInvoices();
    } else {
      toast({ title: "Upload Failed", description: result.error, variant: "destructive" });
    }
    setIsUploading(false);
  };
  
  const handleDeleteInvoice = async (fileName: string) => {
    const result = await deleteInvoiceAction(fileName);
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
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Invoice Management</h1>
        <p className="text-muted-foreground">Upload, view, and manage all purchase invoices.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Upload New Invoice(s)</CardTitle>
              <CardDescription>Select a file and optionally link it to an invoice number.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUploadSubmit)} className="space-y-4">
                  <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/70'}`}>
                    <input {...getInputProps()} />
                    <Icons.Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    {isDragActive ? (
                      <p className="font-semibold text-primary">Drop files here...</p>
                    ) : (
                      <p className="text-muted-foreground">Drag & drop files here, or click to select</p>
                    )}
                  </div>

                  {filesToUpload.length > 0 && (
                    <div className="space-y-2 text-sm">
                      <h4 className="font-medium">Selected files:</h4>
                      <ul className="list-disc list-inside bg-muted/50 p-3 rounded-md max-h-24 overflow-y-auto">
                        {filesToUpload.map((file, i) => (
                          <li key={i} className="truncate">{file.name}</li>
                        ))}
                      </ul>
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setFilesToUpload([])}>Clear selection</Button>
                    </div>
                  )}

                  <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., INV-12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add any relevant notes here..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="w-full" disabled={isUploading || filesToUpload.length === 0}>
                    {isUploading ? <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" /> : <Icons.UploadCloud className="mr-2 h-4 w-4" />}
                    Upload {filesToUpload.length || ''} File(s)
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Uploaded Invoice Log</CardTitle>
              <CardDescription>The complete history of all invoices.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice, index) => {
                      const isManualEntry = invoice.fileName.startsWith('manual_entry_');
                      const displayName = isManualEntry ? `Invoice: ${invoice.fileName.replace('manual_entry_', '')}` : invoice.fileName;

                      return (
                      <TableRow key={index}>
                        <TableCell>
                           <a href={isManualEntry ? undefined : `/api/invoices/${encodeURIComponent(invoice.fileName)}`} target="_blank" rel="noopener noreferrer" className={`font-medium flex items-center gap-2 ${!isManualEntry && 'text-primary hover:underline'}`}>
                                <Icons.FileText className="h-4 w-4" />
                                {displayName}
                           </a>
                           {invoice.notes && <p className="text-xs text-muted-foreground mt-1 pl-6">{invoice.notes}</p>}
                           {isManualEntry && <Badge variant="secondary" className="mt-1 ml-6">Manual Entry - No File</Badge>}
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
                                        <AlertDialogDescription>This will permanently delete the invoice record <span className="font-semibold">{displayName}</span>. This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.fileName)} className="bg-destructive hover:bg-destructive/90">Delete Invoice</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
