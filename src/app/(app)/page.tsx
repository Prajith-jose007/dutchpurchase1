// src/app/(app)/page.tsx

import { getDashboardDataAction } from '@/lib/actions';
import DashboardClientPage from './dashboard-client-page';

// This is now a React Server Component (RSC)
// It fetches data on the server and passes it to the client component.
export default async function DashboardPage() {
  const data = await getDashboardDataAction();
  return <DashboardClientPage initialData={data} />;
}
