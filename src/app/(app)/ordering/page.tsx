
// src/app/(app)/ordering/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { allItems, getItemTypes, getCategories } from '@/data/inventoryItems';
import { branches } from '@/data/appRepository'; // Import branches
import type { Item } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Icons, getCategoryIcon } from '@/components/icons';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ITEMS_PER_PAGE = 12;

export default function OrderingPage() {
  const { addToCart, cartItems, updateQuantity, getItemQuantity } = useCart();
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(branches[0]?.id || '');
  const [selectedItemType, setSelectedItemType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Protect the route: redirect 'purchase' role away from this page
    if (currentUser && currentUser.role === 'purchase') {
      toast({
        title: "Access Denied",
        description: "You do not have permission to create new orders.",
        variant: "destructive"
      });
      router.push('/orders'); // Redirect to a page they can access
    }
  }, [currentUser, router]);


  const itemTypes = useMemo(() => getItemTypes(), []);
  const categories = useMemo(() => getCategories(selectedItemType || undefined), [selectedItemType]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      const matchesSearchTerm = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesItemType = selectedItemType ? item.itemType === selectedItemType : true;
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      return matchesSearchTerm && matchesItemType && matchesCategory;
    });
  }, [searchTerm, selectedItemType, selectedCategory, selectedStoreId]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  const handleAddToCart = (item: Item) => {
    addToCart(item, 1);
    toast({
      title: `${item.description} added to cart`,
      description: `1 ${item.units} added. Total in cart: ${getItemQuantity(item.code) + 1}`,
      variant: "default",
    });
  };
  
  const handleUpdateQuantity = (itemCode: string, change: number) => {
    const currentQuantity = getItemQuantity(itemCode);
    const newQuantity = currentQuantity + change;
    const item = getItemByCode(itemCode);
    if (!item) return;

    if (newQuantity <= 0) {
       updateQuantity(itemCode, 0); 
       toast({ title: "Item removed", description: `${item.description} removed from cart.`});
    } else {
       updateQuantity(itemCode, newQuantity);
       toast({ title: "Quantity updated", description: `${item.description} quantity now ${newQuantity}.`});
    }
  };

  const getItemByCode = (code: string) => allItems.find(item => item.code === code);


  if (!isClient || (currentUser && currentUser.role === 'purchase')) {
    // Render a loading/redirecting state if not client-side yet or if user is being redirected
    return (
       <div className="flex justify-center items-center h-full">
        <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading...</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="flex-grow space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-headline tracking-tight">Order Items</h1>
          <p className="text-muted-foreground">Browse products and add them to your purchase order.</p>
        </header>
        
        <div className="space-y-4 p-4 border rounded-lg bg-card shadow">
          <Input
            placeholder="Search items by name or code..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
            aria-label="Search items"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="store-filter">Select Store</Label>
              <Select value={selectedStoreId} onValueChange={(value) => { setSelectedStoreId(value); setCurrentPage(1); }}>
                <SelectTrigger id="store-filter" aria-label="Select store">
                  <SelectValue placeholder="Select Store" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="item-type-filter">Item Type</Label>
              <Select value={selectedItemType} onValueChange={(value) => { setSelectedItemType(value === 'all' ? '' : value); setSelectedCategory(''); setCurrentPage(1); }}>
                <SelectTrigger id="item-type-filter" aria-label="Filter by item type">
                  <SelectValue placeholder="All Item Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Item Types</SelectItem>
                  {itemTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category-filter">Category</Label>
              <Select value={selectedCategory} onValueChange={(value) => { setSelectedCategory(value === 'all' ? '' : value); setCurrentPage(1); }} disabled={!selectedItemType && categories.length === 0}>
                <SelectTrigger id="category-filter" aria-label="Filter by category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-10">
            <Icons.Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No items match your criteria.</p>
            <p className="text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedItems.map(item => {
                const quantityInCart = getItemQuantity(item.code);
                const IconComponent = getCategoryIcon(item.category, item.itemType) || Icons.Inventory;

                return (
                <Card key={item.code} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
                  <CardContent className="p-4 flex-grow">
                    <CardTitle className="text-lg font-semibold mb-1 line-clamp-2 h-[3em]">{item.description}</CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground mb-2">
                       <IconComponent className="w-3.5 h-3.5 mr-1.5 text-primary" />
                       <span>{item.itemType} - {item.category}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Code: {item.code}</p>
                    <p className="text-sm text-muted-foreground">Unit: {item.units} (Pack: {item.packing})</p>
                  </CardContent>
                  <CardFooter className="p-4 border-t mt-auto">
                    {quantityInCart > 0 ? (
                      <div className="flex items-center justify-between w-full">
                        <Button variant="outline" size="icon" onClick={() => handleUpdateQuantity(item.code, -1)} aria-label={`Decrease quantity of ${item.description}`}>
                          <Icons.Remove className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-mediumtabular-nums w-10 text-center" aria-live="polite">{quantityInCart}</span>
                        <Button variant="outline" size="icon" onClick={() => handleUpdateQuantity(item.code, 1)} aria-label={`Increase quantity of ${item.description}`}>
                          <Icons.Add className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleAddToCart(item)} aria-label={`Add ${item.description} to cart`}>
                        <Icons.Add className="mr-2 h-4 w-4" /> Add to Cart
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )})}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 pt-6">
                <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>              </div>
            )}
          </>
        )}
      </div>

      <Card className="lg:w-96 xl:w-[400px] flex-shrink-0 shadow-xl rounded-lg self-start sticky top-20">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Icons.ShoppingBag className="mr-2 h-6 w-6 text-primary" />
            Your Order
          </CardTitle>
          <CardDescription>Items you've added for purchase.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {cartItems.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Icons.Order className="mx-auto h-10 w-10 mb-2" />
              Your cart is empty.
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-350px)] lg:h-[calc(100vh-420px)] max-h-[500px]">
              <div className="p-4 space-y-3">
                {cartItems.map(item => {
                  const cartItemDetails = getItemByCode(item.code);
                  return (
                  <div key={item.code} className="flex items-center gap-3 p-3 border rounded-md bg-background hover:bg-muted/50">
                    <div className="flex-grow">
                      <p className="font-medium text-sm line-clamp-1">{item.description}</p>
                      <p className="text-xs text-muted-foreground">Unit: {item.units}</p>
                       <p className="text-xs text-muted-foreground">Code: {item.code}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.code, -1)} aria-label={`Decrease ${item.description}`}> <Icons.Remove className="h-3.5 w-3.5" /> </Button>
                      <span className="text-sm font-medium tabular-nums w-5 text-center">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.code, 1)} aria-label={`Increase ${item.description}`}> <Icons.Add className="h-3.5 w-3.5" /> </Button>
                    </div>
                  </div>
                )})}
              </div>
            </ScrollArea>
          )}
        </CardContent>
        {cartItems.length > 0 && (
          <>
            <Separator />
            <CardFooter className="p-4 flex flex-col gap-3">
               <div className="w-full flex justify-between text-lg font-semibold">
                <span>Total Items:</span>
                <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <Link href="/orders/create" className="w-full">
                <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Icons.Success className="mr-2 h-5 w-5" /> Proceed to Checkout
                </Button>
              </Link>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
