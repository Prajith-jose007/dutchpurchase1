import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <header>
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        <Skeleton className="h-4 w-1/2 mt-2 rounded-lg" />
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><Skeleton className="h-20 w-full rounded-lg" /></CardContent></Card>
        <Card><CardContent className="p-4"><Skeleton className="h-20 w-full rounded-lg" /></CardContent></Card>
        <Card><CardContent className="p-4"><Skeleton className="h-20 w-full rounded-lg" /></CardContent></Card>
        <Card><CardContent className="p-4"><Skeleton className="h-20 w-full rounded-lg" /></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full rounded-lg" /></CardContent></Card>
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full rounded-lg" /></CardContent></Card>
      </div>
       <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full rounded-lg" /></CardContent></Card>
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full rounded-lg" /></CardContent></Card>
      </div>
    </div>
  );
}
