// src/app/page.tsx
import { redirect } from 'next/navigation';

// This is the root page of the application.
// It now correctly redirects to the main app dashboard.
// The auth guard is handled in the app layout.
export default function RootPage() {
  redirect('/');
}
