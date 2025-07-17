// src/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';

export default function RootPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the loading is complete before making a decision
    if (!isLoading) {
      if (currentUser) {
        // If user is logged in, send them to the main dashboard/app page
        router.push('/ordering');
      } else {
        // If no user, send them to the login page
        router.push('/login');
      }
    }
  }, [currentUser, isLoading, router]);

  // Render a loading indicator while the auth check is in progress.
  // This is crucial to prevent the redirect loop.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-lg text-muted-foreground">Initializing...</p>
    </div>
  );
}
