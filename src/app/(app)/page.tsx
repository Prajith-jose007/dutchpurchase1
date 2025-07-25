
// src/app/(app)/page.tsx (Dashboard)
import { Suspense } from 'react';
import { getPurchaseReportDataAction, getOrdersAction } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { branches } from '@/data/appRepository';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (value: number | string | null | undefined) => {
  const numValue = Number(value);
  if (isNaN(numValue)) return 'AED 0.00';
  return `AED ${numValue.toFixed(2)}`;
};

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Pending': return 'outline';
    case 'Order Received': return 'secondary';
    case 'Arrived': return 'secondary';
    case 'Closed': return 'default';
    case 'Cancelled': return 'destructive';
    default: return 'outline';
  }
};

const getBranchName = (branchId: string) => branches.find(b => b.id === branchId)?.name || branchId;

// This is a Client Component because it uses recharts, which has hooks.
// We'll wrap the data fetching in a Server Component parent.
"use client";
import React from 'react';

function DashboardClientContent({ reportData, recentOrders }: { reportData: Awaited<ReturnType<typeof getPurchaseReportDataAction>>, recentOrders: Awaited<ReturnType<typeof getOrdersAction>> }) {
  if (!reportData) {
    return <div>Error loading report data.</div>;
  }

  const branchColors = React.useMemo(() => {
    const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
    const colorMap: { [key: string]: string } = {};
    branches.forEach((branch, index) => {
      if (branch.id !== 'branch-all') {
        colorMap[branch.name] = colors[index % colors.length];
      }
    });
    return colorMap;
  }, []);

  const chartConfig = Object.fromEntries(
    Object.entries(branchColors).map(([name, color]) => [name, { label: name, color }])
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">A quick overview of purchase activities.</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Spending Summary</CardTitle>
          <CardDescription>Total purchase amount for all closed orders.</CardDescription>
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
                <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />} />
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
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>A list of the 10 most recently placed orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.length > 0 ? recentOrders.slice(0, 10).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                       <Link href={`/orders/${order.id}`} className="text-primary hover:underline flex items-center gap-2">
                            <Icons.ClipboardList className="h-4 w-4" />
                            {`#${order.id.substring(0,8)}...`}
                        </Link>
                    </TableCell>
                    <TableCell>{getBranchName(order.branchId)}</TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)} className="capitalize">
                          {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(order.totalPrice)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        There are no orders yet.
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
        <header><Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-2/3 mt-2" /></header>
        <Card><CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
            <Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" />
        </CardContent></Card>
        <Separator />
        <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-72 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
    </div>
  )
}


export default async function DashboardPage() {
  // Fetch data on the server
  const reportData = await getPurchaseReportDataAction();
  // We pass a null user to get all orders, as this is a general dashboard
  const recentOrders = await getOrdersAction(null); 
  
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClientContent reportData={reportData} recentOrders={recentOrders} />
    </Suspense>
  );
}
