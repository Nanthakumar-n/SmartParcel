import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TripExpensesLoading() {
  return (
    <div className="space-y-6">
      {/* Top Banner Skeleton */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Trip Switcher Skeleton */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-14 w-48 rounded-md" />
          <Skeleton className="h-14 w-48 rounded-md" />
          <Skeleton className="h-14 w-48 rounded-md" />
        </div>
      </div>

      {/* Main Card Skeleton */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex justify-between items-center pb-4 border-b">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-8 w-28" />
        </div>

        {/* 3 Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>

        {/* Table Skeleton */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
