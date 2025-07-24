
// src/app/(app)/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardDataAction } from '@/lib/actions';
import type { DashboardData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { branches } from '@/data/appRepository';

const formatCurrency = (value: number | string | null | undefined) => {
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return 'AED 0.00';
  }
  return `AED ${numValue.toFixed(2)}`;
};

const getBranchName = (branchId: string) => branches.find(b => b.id === branchId)?.name || 'Unknown';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser) {
        try {
          const result = await getDashboardDataAction();
          setData(result);
        } catch (error) {
          console.error("Failed to fetch dashboard data:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchData();
  }, [currentUser]);

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const chartConfigTotal = { total: { label: "Total Purchases" } };
  const chartConfigDaily = { total: { label: "Daily Purchases" } };
  const chartConfigMonthly = { total: { label: "Monthly Purchases" } };
  const chartConfigStore = Object.fromEntries(
    data.storePurchases.map(item => [item.name, { label: item.name }])
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {currentUser?.name}. Here's your purchase overview.</p>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <Icons.ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalOrdersToday}</div>
            <p className="text-xs text-muted-foreground">Total orders placed today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Icons.Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.activeOrders}</div>
            <p className="text-xs text-muted-foreground">Orders currently in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Orders (Today)</CardTitle>
            <Icons.Success className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.closedOrdersToday}</div>
            <p className="text-xs text-muted-foreground">Orders closed and finalized today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incoming Orders</CardTitle>
            <Icons.Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">New orders awaiting processing</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Total Purchase Trend</CardTitle>
                <CardDescription>Total spending over the last 12 months.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfigTotal} className="h-[250px] w-full">
                    <LineChart data={data.totalPurchases} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => formatCurrency(value).split(' ')[1].replace('.00', '')} />
                        <Tooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                        <Line dataKey="total" type="monotone" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Purchases by Store</CardTitle>
                <CardDescription>Breakdown of total spending per store.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
                <ChartContainer config={chartConfigStore} className="h-[250px] w-full">
                    <PieChart>
                        <Tooltip content={<ChartTooltipContent formatter={(value, name) => <div><p className="font-medium">{name}</p><p>{formatCurrency(Number(value))}</p></div>} />} />
                        <Pie data={data.storePurchases} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="hsl(var(--primary))" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} />
                        <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Daily Purchases</CardTitle>
                <CardDescription>Spending over the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfigDaily} className="h-[250px] w-full">
                    <BarChart data={data.dailyPurchases} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => formatCurrency(value).split(' ')[1].replace('.00', '')} />
                        <Tooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Monthly Purchases</CardTitle>
                <CardDescription>Spending over the last 12 months.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfigMonthly} className="h-[250px] w-full">
                     <BarChart data={data.monthlyPurchases} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => formatCurrency(value).split(' ')[1].replace('.00', '')} />
                        <Tooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}


function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <header>
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-4 w-1/2 mt-2" />
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><Skeleton className="h-8 w-full" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-full" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-full" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-full" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}
