import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function FinancialsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-24 bg-slate-100 rounded-lg border border-slate-200" />

      {/* Date Range Skeleton */}
      <div className="h-14 bg-slate-100 rounded-lg border border-slate-200" />

      {/* Tabs Skeleton */}
      <div className="h-10 w-72 bg-slate-200 rounded-md" />

      {/* 4 Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4 space-y-3">
              <div className="h-3 w-28 bg-slate-200 rounded" />
              <div className="h-8 w-36 bg-slate-300 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3 Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4 space-y-3">
              <div className="h-3 w-28 bg-slate-200 rounded" />
              <div className="h-8 w-36 bg-slate-300 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="h-64 bg-slate-100 rounded-lg border border-slate-200" />
    </div>
  );
}
