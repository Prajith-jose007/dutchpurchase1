
// src/app/(app)/inventory/page.tsx
"use client"; // This page uses client-side filtering and state

import React, { useState, useMemo, useEffect } from 'react';
import { allItems, getItemTypes, getCategories } from '@/data/inventoryItems';
import type { Item } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 15;

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemType, setSelectedItemType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Client-side rendering guard
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const itemTypes = useMemo(() => getItemTypes(), []);
  const categories = useMemo(() => getCategories(selectedItemType || undefined), [selectedItemType]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      const matchesSearchTerm = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.itemType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesItemType = selectedItemType ? item.itemType === selectedItemType : true;
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      return matchesSearchTerm && matchesItemType && matchesCategory;
    });
  }, [searchTerm, selectedItemType, selectedCategory]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  
  if (!isClient) {
     return ( // Skeleton loader
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-4 w-2/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-card shadow">
          <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
        </div>
        <Card className="shadow-lg"><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Inventory Overview</h1>
        <p className="text-muted-foreground">Browse all available items in the restaurant's supply catalog.</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Item Catalog</CardTitle>
          <CardDescription>Filter and search through all available inventory items.</CardDescription>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
              className="md:col-span-1"
              aria-label="Search items"
            />
            <Select value={selectedItemType} onValueChange={(value) => { setSelectedItemType(value === 'all' ? '' : value); setSelectedCategory(''); setCurrentPage(1); }}>
              <SelectTrigger aria-label="Filter by item type">
                <SelectValue placeholder="Filter by Item Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Item Types</SelectItem>
                {itemTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={(value) => { setSelectedCategory(value === 'all' ? '' : value); setCurrentPage(1); }} disabled={!selectedItemType && categories.length === 0}>
              <SelectTrigger aria-label="Filter by category">
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-10">
              <Icons.Search className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No items match your criteria.</p>
              <p className="text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
           ) : (
            <>
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Item Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead className="text-center">Packing</TableHead>
                    <TableHead className="text-center">Shelf Life (Days)</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item: Item) => (
                    <TableRow key={item.code}>
                      <TableCell className="font-medium">{item.code}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.itemType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell>{item.units}</TableCell>
                      <TableCell className="text-center">{item.packing.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{item.shelfLifeDays}</TableCell>
                      <TableCell>
                        {item.remark && <Badge variant="destructive">{item.remark}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
              </ScrollArea>
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 pt-6">
                  <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                  <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                  <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton for loading state
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded-md ${className}`} />;
}
