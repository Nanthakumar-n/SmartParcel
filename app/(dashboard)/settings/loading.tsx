import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-6 pb-12 w-full">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 bg-slate-200" />
          <Skeleton className="h-4 w-96 bg-slate-200" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-40 bg-slate-200 rounded-lg" />
          <Skeleton className="h-9 w-32 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Excel Sheet Tab Strip Skeleton */}
      <div className="w-full space-y-0">
        <div className="bg-slate-100 border border-slate-200 border-b-0 rounded-t-xl px-3 pt-2.5 flex items-center gap-2">
          <Skeleton className="h-10 w-36 bg-slate-200 rounded-t-lg" />
          <Skeleton className="h-10 w-44 bg-slate-200 rounded-t-lg" />
          <Skeleton className="h-10 w-44 bg-slate-200 rounded-t-lg" />
          <Skeleton className="h-10 w-48 bg-slate-200 rounded-t-lg" />
        </div>

        {/* Main Sheet Body Skeleton */}
        <div className="bg-white border border-slate-200 rounded-b-xl p-6 sm:p-8 space-y-8">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xl bg-slate-200" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-60 bg-slate-200" />
                <Skeleton className="h-3.5 w-80 bg-slate-200" />
              </div>
            </div>
            <Skeleton className="h-10 w-48 bg-slate-200 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 bg-slate-200" />
              <Skeleton className="h-10 w-full bg-slate-200 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 bg-slate-200" />
              <Skeleton className="h-10 w-full bg-slate-200 rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 bg-slate-200" />
              <Skeleton className="h-10 w-full bg-slate-200 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 bg-slate-200" />
              <Skeleton className="h-10 w-full bg-slate-200 rounded-md" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-40 bg-slate-200" />
            <Skeleton className="h-10 w-full bg-slate-200 rounded-md" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Skeleton className="h-10 w-full bg-slate-200 rounded-md" />
            <Skeleton className="h-10 w-full bg-slate-200 rounded-md" />
            <Skeleton className="h-10 w-full bg-slate-200 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
