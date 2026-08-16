import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function TripDispatchesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-md" />
          <div className="h-4 w-96 bg-slate-100 rounded-md" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-md" />
      </div>

      {/* Metric Cards Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <div className="h-4 w-28 bg-slate-200 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-8 w-16 bg-slate-300 rounded-md" />
              <div className="h-3 w-32 bg-slate-100 rounded-md" />
            </CardContent>
          </Card>
        ))}
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
