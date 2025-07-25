// src/app/page.tsx
import { redirect } from 'next/navigation';

// This is the root page of the application.
// Its sole purpose is to redirect to the primary page for authenticated users,
// which is the ordering page. The actual auth guard is handled in the app layout.
export default function RootPage() {
  redirect('/ordering');
}
