import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 rounded-md" />
          <div className="h-4 w-96 bg-slate-100 rounded-md" />
        </div>
        <div className="h-9 w-44 bg-slate-200 rounded-md" />
      </div>

      {/* 4 Stats Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-100 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-8 w-20 bg-slate-200 rounded" />
              <div className="h-3 w-36 bg-slate-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 bg-white shadow-xs">
          <CardHeader className="border-b pb-3">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="h-3 w-60 bg-slate-100 rounded mt-1" />
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-md" />
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="border-b pb-3">
            <div className="h-5 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-48 bg-slate-100 rounded mt-1" />
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-md" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
