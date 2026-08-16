import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function BookingRequestsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-md" />
          <div className="h-4 w-96 bg-slate-100 rounded-md" />
        </div>
      </div>

      {/* Table Skeleton */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-4">
          <div className="h-5 w-40 bg-slate-200 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 w-full bg-slate-100 rounded-md" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 w-full bg-slate-50 rounded-md" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
