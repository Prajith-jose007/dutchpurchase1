// src/app/page.tsx
import { redirect } from 'next/navigation';

// This is the root page of the application.
// It redirects to the main ordering page.
// The auth guard is handled in the app layout.
export default function RootPage() {
  redirect('/ordering');
}
