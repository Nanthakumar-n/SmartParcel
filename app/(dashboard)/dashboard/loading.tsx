import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-slate-200 rounded-md" />
        <div className="h-4 w-96 bg-slate-100 rounded-md" />
      </div>

      {/* 4 Stats Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="h-4 w-28 bg-slate-200 rounded" />
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
        <Card className="lg:col-span-2 border-slate-200 h-80">
          <CardHeader>
            <div className="h-5 w-40 bg-slate-200 rounded" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-md" />
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 h-80">
          <CardHeader>
            <div className="h-5 w-32 bg-slate-200 rounded" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-md" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
