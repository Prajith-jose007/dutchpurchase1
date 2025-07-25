// src/app/page.tsx
import { redirect } from 'next/navigation';

// This is the root page of the application.
// Its sole purpose is to redirect to the primary page for authenticated users,
// which is now the main dashboard at /
// The actual auth guard is handled in the app layout.
// In a real app, this might be a public landing page.
export default function RootPage() {
  redirect('/');
}
