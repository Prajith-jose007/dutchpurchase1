
// src/app/(app)/purchase/invoices/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getInvoicesAction, uploadInvoicesAction, deleteInvoiceAction } from '@/lib/actions';
import type { Invoice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const uploadSchema = z.object({
  notes: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export default function InvoiceManagementPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { notes: '' },
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

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFileToUpload(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
      onDrop,
      maxFiles: 1,
      accept: {
          'image/jpeg': ['.jpeg', '.jpg'],
          'image/png': ['.png'],
          'application/pdf': ['.pdf'],
      }
  });

  const selectedInvoices = useMemo(() => 
    selectedInvoiceIds.map(id => invoices.find(inv => inv.id === id)).filter(Boolean) as Invoice[],
    [selectedInvoiceIds, invoices]
  );
  
  const canUpload = useMemo(() => {
    if (selectedInvoices.length === 0 || !fileToUpload) return false;
    // Ensure all selected invoices have the same invoice number
    const firstInvoiceNumber = selectedInvoices[0]?.invoiceNumber;
    if (!firstInvoiceNumber) return false;
    return selectedInvoices.every(inv => inv.invoiceNumber === firstInvoiceNumber);
  }, [selectedInvoices, fileToUpload]);

  const handleUploadSubmit = async (data: UploadFormData) => {
    if (!currentUser || !canUpload || !fileToUpload) return;
    
    setIsUploading(true);

    const formData = new FormData();
    formData.append('invoiceFile', fileToUpload);
    formData.append('userId', currentUser.id);
    formData.append('invoiceNumber', selectedInvoices[0].invoiceNumber);
    if (data.notes) {
      formData.append('notes', data.notes);
    }
    selectedInvoiceIds.forEach(id => formData.append('invoiceIds[]', id.toString()));

    const result = await uploadInvoicesAction(formData);

    if (result.success) {
      toast({ title: "Upload Successful", description: `Invoice file has been linked to invoice #${selectedInvoices[0].invoiceNumber}.` });
      form.reset();
      setFileToUpload(null);
      setSelectedInvoiceIds([]);
      await fetchInvoices();
    } else {
      toast({ title: "Upload Failed", description: result.error, variant: "destructive" });
    }
    setIsUploading(false);
  };
  
  const handleDeleteInvoice = async (invoiceId: number) => {
    const result = await deleteInvoiceAction(invoiceId);
    if(result.success) {
        toast({ title: "Invoice Deleted", description: "The invoice record has been removed." });
        await fetchInvoices();
    } else {
        toast({ title: "Error", description: result.error || "Could not delete the invoice.", variant: "destructive" });
    }
  };

  const handleSelectInvoice = (invoiceId: number, checked: boolean | 'indeterminate') => {
    setSelectedInvoiceIds(currentSelectedIds => {
      let newSelectedIds;
      if (checked) {
        newSelectedIds = [...currentSelectedIds, invoiceId];
      } else {
        newSelectedIds = currentSelectedIds.filter(id => id !== invoiceId);
      }

      // If we are adding an item, let's filter to ensure consistency
      if (newSelectedIds.length > 0) {
        const firstSelectedInvoice = invoices.find(inv => inv.id === newSelectedIds[0]);
        if (firstSelectedInvoice) {
          return newSelectedIds.filter(id => {
            const currentInv = invoices.find(inv => inv.id === id);
            return currentInv && currentInv.invoiceNumber === firstSelectedInvoice.invoiceNumber;
          });
        }
      }
      return newSelectedIds;
    });
  };

  const isSelectionInconsistent = useMemo(() => {
    if (selectedInvoices.length <= 1) return false;
    const firstInvoiceNumber = selectedInvoices[0].invoiceNumber;
    return !selectedInvoices.every(inv => inv.invoiceNumber === firstInvoiceNumber);
  }, [selectedInvoices]);

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
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Invoice Log</CardTitle>
              <CardDescription>Select invoices with the same number to upload a master file.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead padding="checkbox">
                      </TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>File / Status</TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const isSelected = selectedInvoiceIds.includes(invoice.id);
                      const canBeSelected = !invoice.fileName && (!selectedInvoices.length || selectedInvoices[0].invoiceNumber === invoice.invoiceNumber);

                      return (
                      <TableRow key={invoice.id} data-state={isSelected && "selected"}>
                        <TableCell>
                           <Checkbox
                            checked={isSelected}
                            disabled={!!invoice.fileName || (selectedInvoices.length > 0 && selectedInvoices[0].invoiceNumber !== invoice.invoiceNumber && !isSelected)}
                            onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked)}
                            aria-label={`Select invoice ${invoice.invoiceNumber}`}
                           />
                        </TableCell>
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
                    )})}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="shadow-lg sticky top-20">
            <CardHeader>
              <CardTitle>Upload Master Invoice</CardTitle>
               {selectedInvoices.length > 0 ? (
                <CardDescription>
                  Uploading for invoice <span className="font-bold text-primary">{selectedInvoices[0].invoiceNumber}</span> ({selectedInvoices.length} order entries selected).
                </CardDescription>
                ) : (
                <CardDescription>First, select one or more entries from the log.</CardDescription>
               )}
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUploadSubmit)} className="space-y-4">
                  <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/70'} ${selectedInvoices.length === 0 && 'opacity-50 cursor-not-allowed'}`}>
                    <input {...getInputProps()} disabled={selectedInvoices.length === 0} />
                    <Icons.Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    {fileToUpload ? (
                      <p className="font-semibold text-primary">{fileToUpload.name}</p>
                    ) : isDragActive ? (
                      <p className="font-semibold text-primary">Drop file here...</p>
                    ) : (
                      <p className="text-muted-foreground">Drag & drop a file here, or click to select</p>
                    )}
                  </div>

                  {fileToUpload && (
                     <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setFileToUpload(null)}>Clear selection</Button>
                  )}

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Update Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add or update notes for the selected invoices..." {...field} disabled={selectedInvoices.length === 0}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="w-full" disabled={!canUpload || isUploading}>
                    {isUploading ? <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" /> : <Icons.UploadCloud className="mr-2 h-4 w-4" />}
                    Upload & Link Invoice
                  </Button>
                  {isSelectionInconsistent && <p className="text-xs text-destructive text-center mt-2">You can only select invoices that share the same invoice number.</p>}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
