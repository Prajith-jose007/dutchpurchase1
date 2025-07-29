// src/app/(app)/admin/reports/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getOrdersAction, getPurchaseReportDataAction } from '@/lib/actions';
import type { Order, PurchaseReportData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { branches } from '@/data/appRepository';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatCurrency = (value: number | string | null | undefined) => {
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return 'AED 0.00';
  }
  return `AED ${numValue.toFixed(2)}`;
};

export default function ReportsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reportData, setReportData] = useState<PurchaseReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser && !['admin', 'superadmin'].includes(currentUser.role)) {
      toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
      router.push('/');
      return;
    }

    const fetchData = async () => {
      if (currentUser) {
        try {
          const [fetchedOrders, fetchedReportData] = await Promise.all([
             getOrdersAction(currentUser),
             getPurchaseReportDataAction()
          ]);
          setOrders(fetchedOrders);
          setReportData(fetchedReportData);
        } catch (error) {
          toast({ title: "Error", description: "Failed to fetch report data.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      } else {
        router.push('/login');
      }
    };

    if (currentUser) {
      fetchData();
    } else if(!isLoading) {
      router.push('/login');
    }
  }, [currentUser, router, isLoading]);

  const closedOrders = useMemo(() => orders.filter(o => o.status === 'Closed'), [orders]);
  
  const getBranchName = (branchId: string) => branches.find(b => b.id === branchId)?.name || branchId;

  const branchColors = useMemo(() => {
    const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
    const colorMap: { [key: string]: string } = {};
    branches.forEach((branch, index) => {
        if(branch.id !== 'branch-all') {
            colorMap[branch.name] = colors[index % colors.length];
        }
    });
    return colorMap;
  }, []);

  if (isLoading || !reportData) {
    return (
      <div className="flex justify-center items-center h-full">
        <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Reports...</p>
      </div>
    );
  }
  
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role)) {
    return null; // Render nothing while redirecting
  }

  const chartConfig = Object.fromEntries(
    Object.entries(branchColors).map(([name, color]) => [name, { label: name, color }])
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Admin Reports</h1>
        <p className="text-muted-foreground">View spending summaries and all closed orders.</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle>Spending Summary</CardTitle>
            <CardDescription>Total purchase amount for closed orders.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Today's Total Spend</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalToday)}</p>
            </div>
            <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">This Month's Total Spend</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalThisMonth)}</p>
            </div>
             <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">This Year's Total Spend</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalThisYear)}</p>
            </div>
        </CardContent>
      </Card>
      
      <Separator />

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Monthly Purchase by Store</CardTitle>
          <CardDescription>Total spending per branch over the last 12 months.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `AED ${Number(value) / 1000}k`} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />}
                />
                <Legend content={<ChartLegendContent />} />
                {Object.keys(branchColors).map(branchName => (
                    <Line key={branchName} type="monotone" dataKey={branchName} stroke={branchColors[branchName]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Closed Orders Report</CardTitle>
          <CardDescription>A complete log of all fulfilled and closed orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Placed By</TableHead>
                  <TableHead>Closed By</TableHead>
                  <TableHead>Closed On</TableHead>
                  <TableHead>Attachments</TableHead>
                  <TableHead className="text-right">Total Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedOrders.length > 0 ? closedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                       <Link href={`/orders/${order.id}`} className="text-primary hover:underline flex items-center gap-2">
                            <Icons.ClipboardList className="h-4 w-4" />
                            {`#${order.id.substring(0,8)}...`}
                        </Link>
                    </TableCell>
                    <TableCell>{getBranchName(order.branchId)}</TableCell>
                    <TableCell>{order.placingUserName || 'N/A'}</TableCell>
                    <TableCell>{order.receivingUserName || 'N/A'}</TableCell>
                    <TableCell>{order.receivedAt ? new Date(order.receivedAt).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={order.invoiceFileNames && order.invoiceFileNames.length > 0 ? 'default' : 'secondary'}>
                        {order.invoiceFileNames?.length || 0} file(s)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(order.totalPrice)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                        There are no closed orders yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
