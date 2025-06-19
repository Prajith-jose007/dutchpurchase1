
// src/app/(app)/providers.tsx
"use client";

import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext"; // Import AuthProvider
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider> {/* AuthProvider wraps CartProvider and children */}
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  );
}
