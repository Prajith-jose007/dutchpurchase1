
// src/app/(app)/orders/[orderId]/page.tsx
import { getOrderByIdAction } from '@/lib/actions';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { branches, users } from '@/data/appRepository';
import { Separator } from '@/components/ui/separator';

function getStatusBadgeVariant(status: Order['status']): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'Pending': return 'outline';
    case 'Approved': return 'default';
    case 'Processing': return 'default';
    case 'Shipped': return 'secondary';
    case 'Delivered': return 'default';
    case 'Cancelled': return 'destructive';
    default: return 'outline';
  }
}

export default async function OrderDetailsPage({ params }: { params: { orderId: string } }) {
  const order = await getOrderByIdAction(params.orderId);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Icons.Error className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-headline mb-2">Order Not Found</h1>
        <p className="text-muted-foreground mb-6">The order you are looking for does not exist or could not be retrieved.</p>
        <Link href="/orders">
          <Button variant="outline">
            <Icons.OrderList className="mr-2 h-4 w-4" /> Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  const branchName = branches.find(b => b.id === order.branchId)?.name || order.branchId;
  const placingUser = users.find(u => u.id === order.userId);
  const userName = placingUser?.name || order.userId;


  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline tracking-tight">Order Details</h1>
          <p className="text-muted-foreground">Information for order #{order.id.substring(0,8)}...</p>
        </div>
        <Link href="/orders" className="w-full md:w-auto">
          <Button variant="outline" className="w-full md:w-auto">
            <Icons.OrderList className="mr-2 h-4 w-4" /> All Orders
          </Button>
        </Link>
      </header>

      <Card className="shadow-lg">
        <CardHeader className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Order ID</CardTitle>
            <CardDescription>{order.id}</CardDescription>
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Date Placed</CardTitle>
            <CardDescription>{new Date(order.createdAt).toLocaleString()}</CardDescription>
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Status</CardTitle>
            <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm capitalize">{order.status}</Badge>
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Branch</CardTitle>
            <CardDescription>{branchName}</CardDescription>
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Placed By</CardTitle>
            <CardDescription>{userName}</CardDescription>
          </div>
           <div>
            <CardTitle className="text-base font-semibold">Total Items</CardTitle>
            <CardDescription>{order.totalItems}</CardDescription>
          </div>
        </CardHeader>
        
        <Separator />

        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4 font-headline">Items Ordered</h3>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Units</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => {
                  return (
                  <TableRow key={item.itemId}>
                    <TableCell className="font-medium">{item.itemId}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell>{item.units}</TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="border-t pt-6">
          <p className="text-sm text-muted-foreground">
            If you have any questions about this order, please contact support.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
