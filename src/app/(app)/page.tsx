import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { mockOrders } from '@/data/mockData'; // Assuming some mock data for display

export default function DashboardPage() {
  const recentOrdersCount = mockOrders.filter(o => new Date(o.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
  const pendingOrdersCount = mockOrders.filter(o => o.status === 'Pending').length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your restaurant supply activities.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Orders (Last 7 Days)</CardTitle>
            <Icons.OrderList className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentOrdersCount}</div>
            <p className="text-xs text-muted-foreground">orders placed recently</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Icons.Archive className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrdersCount}</div>
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
             <Link href="/forecasting" passHref>
              <Button className="w-full" variant="secondary">
                <Icons.Forecast className="mr-2 h-4 w-4" /> View Demand Forecast
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Welcome to Restaurant Supply Hub</CardTitle>
            <CardDescription>
              Efficiently manage your restaurant's inventory, place orders, track supplies, and forecast demand with our integrated platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Use the navigation on the left to access different sections of the application:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Order Items:</strong> Browse the catalog and create new purchase orders.</li>
              <li><strong>My Orders:</strong> Track the status of your submitted orders.</li>
              <li><strong>Demand Forecast:</strong> Utilize AI to predict future inventory needs.</li>
              <li><strong>Inventory:</strong> View and manage your current stock levels.</li>
            </ul>
            <div className="flex gap-4 mt-6">
              <Link href="/ordering" passHref>
                <Button size="lg">
                  <Icons.ShoppingBag className="mr-2 h-5 w-5" /> Start Ordering
                </Button>
              </Link>
              <Link href="/orders" passHref>
                <Button variant="outline" size="lg">
                  <Icons.Truck className="mr-2 h-5 w-5" /> Track Orders
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
