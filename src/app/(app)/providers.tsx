
// src/app/(app)/providers.tsx
"use client";

import { CartProvider } from "@/contexts/CartContext";
import type { ReactNode } from "react";

export function InnerAppProviders({ children }: { children: ReactNode }) {
  return (
      <CartProvider>
        {children}
      </CartProvider>
  );
}
