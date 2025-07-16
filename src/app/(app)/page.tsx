// src/app/(app)/page.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { useEffect, useState, useMemo } from 'react';
import { getOrdersAction, getUsersAction } from '@/lib/actions';
import { useAuth } from '@/contexts/AuthContext';
import { Order, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { allItems } from '@/data/inventoryItems';
import { branches } from '@/data/appRepository';
import { getStatusBadgeVariant } from '@/lib/utils';


// Admin Dashboard Component
function AdminDashboard({ orders, users, isLoading }: { orders: Order[], users: User[], isLoading: boolean }) {
  const totalOrdersCount = orders.length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'Delivered' || o.status === 'Closed').length;
  const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length;
  const totalAmount = orders.reduce((sum, o) => sum + o.totalPrice, 0);
  const totalProducts = allItems.length;
  const activeOutletsCount = branches.filter(b => b.id !== 'branch-all').length;

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  
  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'N/A';
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive overview of all restaurant supply activities.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Icons.ClipboardList className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{totalOrdersCount}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
            <Icons.Truck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{deliveredOrdersCount}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Icons.Archive className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{pendingOrdersCount}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <Icons.Dollar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">AED {totalAmount.toFixed(2)}</div>}
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Outlets</CardTitle>
            <Icons.Branches className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{activeOutletsCount}</div>}
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Icons.Inventory className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{totalProducts}</div>}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recent Order History</CardTitle>
            <CardDescription>A summary of the last 5 orders across all branches.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-primary hover:underline">
                        <Link href={`/orders/${order.id}`}>{order.id.substring(0,15)}...</Link>
                      </TableCell>
                      <TableCell>{branches.find(b => b.id === order.branchId)?.name || 'N/A'}</TableCell>
                      <TableCell>{getUserName(order.userId)}</TableCell>
                      <TableCell className="text-right">AED {order.totalPrice.toFixed(2)}</TableCell>
                       <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)} className="capitalize">
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// User Dashboard Component
function UserDashboard({ orders, isLoading }: { orders: Order[], isLoading: boolean }) {
  const recentOrdersCount = orders.filter(o => new Date(o.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
  const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your restaurant supply activities.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Recent Orders (Last 7 Days)</CardTitle>
            <Icons.ClipboardList className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{recentOrdersCount}</div>}
            <p className="text-xs text-muted-foreground">orders you've placed recently</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Pending Orders</CardTitle>
            <Icons.Archive className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{pendingOrdersCount}</div>}
            <p className="text-xs text-muted-foreground">orders awaiting action</p>
          </CardContent>
        </Card>
         <Card className="bg-primary/10 border-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground">Quick Actions</CardTitle>
             <Icons.Add className="h-5 w-5 text-primary-foreground/80" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
             <Link href="/ordering" passHref>
              <Button className="w-full" variant="default">
                <Icons.Order className="mr-2 h-4 w-4" /> Create New Order
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Welcome to Dutch Oriental</CardTitle>
            <CardDescription>
              Efficiently manage your restaurant's inventory, place orders, and track supplies with our integrated platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Use the navigation on the left to access different sections of the application.
            </p>
            <div className="flex gap-4 mt-6">
              <Link href="/ordering" passHref>
                <Button size="lg">
                  <Icons.ShoppingBag className="mr-2 h-5 w-5" /> Start Ordering
                </Button>
              </Link>
              <Link href="/purchase/notifications" passHref>
                <Button variant="outline" size="lg">
                  <Icons.Bell className="mr-2 h-5 w-5" /> View Notifications
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}


export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  useEffect(() => {
    const fetchData = async () => {
        if (currentUser) {
            setIsLoading(true);
            try {
                const fetchedOrders = await getOrdersAction(currentUser);
                setOrders(fetchedOrders);

                if (isAdmin) {
                    const fetchedUsers = await getUsersAction();
                    setUsers(fetchedUsers);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [currentUser, isAdmin]);


  if (isLoading || !currentUser) {
    return (
       <div className="flex justify-center items-center h-full">
        <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Dashboard...</p>
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboard orders={orders} users={users} isLoading={isLoading} />;
  }
  
  return <UserDashboard orders={orders} isLoading={isLoading} />;
}
