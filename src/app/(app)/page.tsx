// src/app/(app)/page.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading || !currentUser) {
    return (
       <div className="flex justify-center items-center h-full">
        <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the Restaurant Supply Hub, {currentUser.name}.</p>
      </header>

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
              <Link href="/orders" passHref>
                <Button variant="outline" size="lg">
                  <Icons.ClipboardList className="mr-2 h-5 w-5" /> View My Orders
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
