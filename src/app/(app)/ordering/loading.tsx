// src/app/(app)/ordering/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderingLoading() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full animate-pulse">
        <div className="flex-grow space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-4 p-4 border rounded-lg bg-card shadow">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
            </div>
        </div>
        <div className="lg:w-96 xl:w-[400px] flex-shrink-0">
             <Skeleton className="h-[500px] rounded-lg" />
        </div>
    </div>
  );
}
