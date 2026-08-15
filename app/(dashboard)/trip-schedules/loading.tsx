import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function TripSchedulesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-slate-200 rounded" />
          <div className="h-4 w-80 bg-slate-100 rounded" />
        </div>
        <div className="h-10 w-44 bg-slate-200 rounded" />
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="h-4 w-28 bg-slate-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-slate-300 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4 space-y-4">
              <div className="h-6 w-3/4 bg-slate-200 rounded" />
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-12 w-full bg-slate-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
