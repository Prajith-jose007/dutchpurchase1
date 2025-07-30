
// src/app/(app)/admin/inventory/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getItemsAction, addItemAction, updateItemAction, deleteItemAction, importInventoryAction } from '@/lib/actions';
import type { Item } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';


const itemSchema = z.object({
  code: z.string().min(1, "Item code cannot be empty."),
  description: z.string().min(3, "Description must be at least 3 characters."),
  itemType: z.string().min(1, "Item type is required."),
  category: z.string().min(1, "Category is required."),
  units: z.string().min(1, "Units are required."),
  packing: z.coerce.number().min(0, "Packing must be a positive number."),
  shelfLifeDays: z.coerce.number().int().min(0, "Shelf life must be a positive integer."),
  price: z.coerce.number().min(0, "Price must be a positive number."),
  remark: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

export default function InventoryManagementPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for dialogs
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // State for import
  const [importFile, setImportFile] = useState<File | null>(null);

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  const fetchItems = async () => {
    try {
      const fetchedItems = await getItemsAction();
      setItems(fetchedItems);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch inventory items.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (currentUser && !['admin', 'superadmin'].includes(currentUser.role)) {
      toast({ title: "Access Denied", description: "You don't have permission to view this page.", variant: "destructive" });
      router.push('/');
      return;
    }
    if (currentUser) {
      fetchItems().finally(() => setIsLoading(false));
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (editingItem) {
      form.reset({
        ...editingItem,
        remark: editingItem.remark || '',
      });
    } else {
      form.reset({
        code: '', description: '', itemType: '', category: '', units: '', packing: 0, shelfLifeDays: 0, price: 0, remark: ''
      });
    }
  }, [editingItem, form]);

  const handleOpenItemDialog = (item: Item | null) => {
    setEditingItem(item);
    setIsItemDialogOpen(true);
  };
  
  const handleItemFormSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true);
    const action = editingItem ? updateItemAction : addItemAction;
    const result = await action(data as Item);

    if (result.success) {
      toast({ title: "Success", description: `Item has been ${editingItem ? 'updated' : 'added'}.` });
      setIsItemDialogOpen(false);
      await fetchItems();
    } else {
      toast({ title: "Error", description: result.error || "An unknown error occurred.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const handleDeleteItem = async (code: string) => {
    const result = await deleteItemAction(code);
    if (result.success) {
      toast({ title: "Item Deleted", description: "The item has been removed from inventory." });
      await fetchItems();
    } else {
      toast({ title: "Error", description: result.error || "Could not delete item.", variant: "destructive" });
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setImportFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
    multiple: false,
  });

  const handleImport = async () => {
    if (!importFile) {
        toast({ title: "No File", description: "Please select a CSV or TXT file to import.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('inventoryFile', importFile);
    
    const result = await importInventoryAction(formData);
    
    if (result.success) {
        toast({ title: "Import Successful", description: `${result.count} items were processed.` });
        await fetchItems();
        setIsImportDialogOpen(false);
        setImportFile(null);
    } else {
        toast({ title: "Import Failed", description: result.error || "An error occurred during import.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDownloadSample = () => {
    const header = "CODE REMARK TYPE CATEGORY DESCRIPTION UNITS PACKING SHELF PRICE";
    const exampleRow = "999 NEW DRY SPICE \"Sample Spice with details\" KG 1 180 25.50";
    const plainTextContent = `data:text/plain;charset=utf-8,${encodeURIComponent(header + '\n' + exampleRow)}`;
    const link = document.createElement("a");
    link.setAttribute("href", plainTextContent);
    link.setAttribute("download", "inventory_sample.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Icons.Dashboard className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">Loading Inventory...</p></div>;
  }
  
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role)) return null;

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground">Add, edit, and import supply items.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleOpenItemDialog(null)}><Icons.Add className="mr-2 h-4 w-4" /> Add New Item</Button>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}><Icons.UploadCloud className="mr-2 h-4 w-4" /> Import Items</Button>
          </div>
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>All Inventory Items</CardTitle>
            <CardDescription>The complete catalog of items available for ordering.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.code}>
                      <TableCell className="font-mono">{item.code}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right font-medium">AED {item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Icons.Settings className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleOpenItemDialog(item)}><Icons.User className="mr-2 h-4 w-4" /> Edit Item</DropdownMenuItem>
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Icons.Delete className="mr-2 h-4 w-4" /> Delete Item</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete the item <span className="font-semibold">{item.code}: {item.description}</span>. This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteItem(item.code)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>{editingItem ? `Update details for ${editingItem.code}.` : 'Enter the details for the new item.'}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleItemFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Item Code</FormLabel><FormControl><Input placeholder="e.g., 101" {...field} disabled={!!editingItem} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Baby Corn" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="itemType" render={({ field }) => (<FormItem><FormLabel>Item Type</FormLabel><FormControl><Input placeholder="e.g., Fruits & Veg" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., Veg" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="units" render={({ field }) => (<FormItem><FormLabel>Units</FormLabel><FormControl><Input placeholder="e.g., KG" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="packing" render={({ field }) => (<FormItem><FormLabel>Packing</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="shelfLifeDays" render={({ field }) => (<FormItem><FormLabel>Shelf Life (Days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="remark" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Remark (Optional)</FormLabel><FormControl><Input placeholder="e.g., NEW, ROBO" {...field} /></FormControl><FormMessage /></FormItem>)} />
              
              <DialogFooter className="md:col-span-2 pt-4">
                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                   {isSubmitting ? <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Success className="mr-2 h-4 w-4" />}
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
       {/* Import Items Dialog */}
       <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Inventory from File</DialogTitle>
              <DialogDescription>
                Upload a space-delimited text file with inventory data. The file should have a header row like:
                CODE REMARK TYPE CATEGORY DESCRIPTION UNITS PACKING SHELF PRICE
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <div {...getRootProps()} className={`mt-4 p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/70'}`}>
                    <input {...getInputProps()} />
                    <Icons.Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    {importFile ? (
                        <p className="font-semibold text-primary">{importFile.name}</p>
                    ) : isDragActive ? (
                        <p className="font-semibold text-primary">Drop the file here...</p>
                    ) : (
                        <p className="text-muted-foreground">Drag & drop a file here, or click to select</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">OR</span>
                    <Separator className="flex-1" />
                </div>
                <Button variant="outline" className="w-full" onClick={handleDownloadSample}>
                    <Icons.Download className="mr-2 h-4 w-4" /> Download Sample Format
                </Button>
            </div>
            <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                <Button onClick={handleImport} disabled={!importFile || isSubmitting}>
                    {isSubmitting ? <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" /> : <Icons.UploadCloud className="mr-2 h-4 w-4" />}
                    Import File
                </Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>
    </>
  );
}

    