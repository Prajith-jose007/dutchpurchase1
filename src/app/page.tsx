// src/app/page.tsx
import { redirect } from 'next/navigation';

// This is the root page of the application.
// It redirects to the main ordering page for most users,
// and to the order history page for employees.
export default function RootPage() {
  // The logic to redirect based on role is now handled in the AuthContext/login flow
  // and in the individual page components.
  // We can keep this simple and redirect to a default "logged in" page.
  // The layout will handle the initial auth check.
  redirect('/ordering');
}
