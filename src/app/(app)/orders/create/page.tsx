
// src/app/(app)/orders/create/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { submitOrderAction } from '@/lib/actions';
import { branches } from '@/data/appRepository';
import { toast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatQuantity } from '@/lib/formatters';

// A custom component for the quantity input logic on the checkout page
const CheckoutQuantityInput = ({ item, isSubmitting }: { item: { code: string; quantity: number; units: string; }, isSubmitting: boolean }) => {
    const { updateQuantity, removeFromCart } = useCart();
    
    // Local state to manage the input value (as a string)
    const [displayQuantity, setDisplayQuantity] = useState(item.quantity.toString());

    // Update local state if the cart item changes from elsewhere
    useEffect(() => {
        setDisplayQuantity(item.quantity.toString());
    }, [item.quantity]);

    const handleQuantityChange = (newValueStr: string) => {
        setDisplayQuantity(newValueStr); // Update the input visually immediately

        const newQuantityNum = parseFloat(newValueStr);
        if (isNaN(newQuantityNum)) return;
        
        if (newQuantityNum <= 0) {
            removeFromCart(item.code);
        } else {
            updateQuantity(item.code, newQuantityNum);
        }
    };
    
    return (
        <div className="flex items-center justify-center gap-1.5">
            <Input
                type="number"
                value={displayQuantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="w-24 text-center"
                disabled={isSubmitting}
                step="any"
            />
        </div>
    );
};


export default function CreateOrderPage() {
  const { cartItems, totalCartPrice, clearCart, updateQuantity, removeFromCart } = useCart();
  const { currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const branchIdFromUrl = searchParams.get('branchId');
    if (branchIdFromUrl) {
      setSelectedBranchId(branchIdFromUrl);
    } else if (currentUser?.branchIds && currentUser.branchIds.length === 1 && currentUser.branchIds[0] !== 'branch-all') {
      setSelectedBranchId(currentUser.branchIds[0]);
    }
    
    if (cartItems.length === 0 && isClient) { 
       router.push('/ordering'); 
    }
  }, [cartItems, router, isClient, searchParams, currentUser]);


  const handleSubmitOrder = async () => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "User not logged in. Please log in again.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (!selectedBranchId) {
      toast({ title: "Missing Information", description: "Could not determine the branch for this order.", variant: "destructive" });
      return;
    }
    if (cartItems.length === 0) {
      toast({ title: "Empty Cart", description: "Cannot submit an empty order.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const result = await submitOrderAction(cartItems, selectedBranchId, currentUser.id);
    setIsSubmitting(false);

    if (result.success && result.orderId) {
      toast({ title: "Order Submitted!", description: `Your order #${result.orderId.substring(0,8)}... has been placed.`, variant: "default" });
      clearCart();
      router.push(`/orders/${result.orderId}`);
    } else {
      toast({ title: "Order Submission Failed", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    }
  };
  
  if (!isClient || !currentUser) {
    return <div className="flex justify-center items-center h-screen"><Icons.Dashboard className="h-12 w-12 animate-spin text-primary" /> <p className="ml-4 text-lg">Loading checkout...</p></div>;
  }

  if (cartItems.length === 0) {
     return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Icons.ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-headline mb-2">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-6">Add some items from the ordering page to proceed.</p>
        <Link href="/ordering">
          <Button>
            <Icons.Order className="mr-2 h-4 w-4" /> Go to Ordering
          </Button>
        </Link>
      </div>
    );
  }
  
  const selectedBranchName = branches.find(b => b.id === selectedBranchId)?.name || 'N/A';

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-headline tracking-tight">Review Your Order</h1>
        <p className="text-muted-foreground">Confirm items and details before submitting.</p>
      </header>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
          <CardDescription>You have {cartItems.length} item(s) in your cart.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="branch-info">Branch</Label>
              <Input id="branch-info" value={selectedBranchName} readOnly disabled className="bg-muted/50"/>
            </div>
            <div>
              <Label htmlFor="user-info">User</Label>
              <Input id="user-info" value={currentUser?.name || 'N/A'} readOnly disabled className="bg-muted/50"/>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center w-40">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartItems.map(item => (
                  <TableRow key={item.code}>
                    <TableCell>
                      <div className="font-medium">{item.description}</div>
                      <div className="text-xs text-muted-foreground">{item.code}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <CheckoutQuantityInput item={item} isSubmitting={isSubmitting} />
                      <span className="text-sm text-muted-foreground ml-2">
                        {item.units}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">AED {item.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">AED {(item.price * item.quantity).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.code)} disabled={isSubmitting} aria-label={`Remove ${item.description} from cart`}>
                        <Icons.Delete className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col md:flex-row justify-between items-start gap-4 border-t pt-6">
          <Link href="/ordering">
            <Button variant="outline" disabled={isSubmitting}>
              <Icons.Order className="mr-2 h-4 w-4" /> Continue Shopping
            </Button>
          </Link>
          <div className="flex-grow flex flex-col items-end gap-2">
            <div className="text-lg font-semibold">
              <span>Total Price: </span>
              <span className="text-primary">AED {totalCartPrice.toFixed(2)}</span>
            </div>
            <Button size="lg" onClick={handleSubmitOrder} disabled={isSubmitting || cartItems.length === 0 || !selectedBranchId} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {isSubmitting ? (
                <Icons.Dashboard className="mr-2 h-5 w-5 animate-spin" /> 
              ) : (
                <Icons.Success className="mr-2 h-5 w-5" />
              )}
              {isSubmitting ? "Submitting Order..." : "Confirm & Submit Order"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
