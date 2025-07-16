
// src/app/(app)/admin/inventory/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { getRawInventoryDataAction, updateInventoryAction } from '@/lib/inventoryActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ManageInventoryPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [inventoryData, setInventoryData] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Protect the route for admin/superadmin only
    if (currentUser && !['admin', 'superadmin'].includes(currentUser.role)) {
      toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const data = await getRawInventoryDataAction();
        setInventoryData(data);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load inventory data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchData();
    }
  }, [currentUser, router]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateInventoryAction(inventoryData);
      if (result.success) {
        toast({ title: "Success", description: "Inventory data has been updated." });
      } else {
        toast({ title: "Save Failed", description: result.error || 'An unknown error occurred.', variant: "destructive" });
      }
    } catch (error) {
        toast({ title: "Error", description: "An error occurred while saving.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Inventory Editor...</p>
      </div>
    );
  }
  
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role)) {
    return null; // Render nothing while redirecting
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Manage Inventory</h1>
        <p className="text-muted-foreground">Directly edit the raw inventory data. Be careful with formatting.</p>
      </header>

      <Alert variant="destructive">
        <Icons.Warning className="h-4 w-4" />
        <AlertTitle>Warning: Direct Data Editing</AlertTitle>
        <AlertDescription>
          You are editing the raw data file for the entire inventory. Changes here are permanent and can affect the entire application. Ensure each line maintains the correct column structure: <br />
          <code className="text-xs font-mono p-1 bg-muted rounded">CODE REMARK TYPE CATEGORY DESCRIPTION UNITS PACKING SHELF PRICE</code>
        </AlertDescription>
      </Alert>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Raw Inventory Data</CardTitle>
          <CardDescription>Add new lines for new items or modify existing lines to update pricing and details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={inventoryData}
            onChange={(e) => setInventoryData(e.target.value)}
            className="min-h-[500px] font-mono text-xs whitespace-pre"
            placeholder="Loading inventory data..."
          />
        </CardContent>
        <CardFooter className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Success className="mr-2 h-4 w-4" />}
                Save Changes
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
