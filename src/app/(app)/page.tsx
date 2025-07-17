
// src/app/(app)/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardRedirectPage() {
    const router = useRouter();
    const { currentUser, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            if (currentUser) {
                // Default to the ordering page for a logged-in user
                router.replace('/ordering');
            } else {
                // If somehow they land here without being logged in, send to login
                router.replace('/login');
            }
        }
    }, [isLoading, currentUser, router]);

    // This page is just for routing logic, it can show a generic loader
    return null;
}
