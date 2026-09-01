import React from 'react';

export default function FinancialsLoading() {
  return (
    <div className="w-full space-y-6 animate-pulse pb-12">
      {/* Top Banner Skeleton */}
      <div className="h-24 bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 bg-slate-200 rounded-xl" />
          <div className="space-y-2">
            <div className="h-5 w-64 bg-slate-200 rounded" />
            <div className="h-3 w-96 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-28 bg-slate-200 rounded" />
          <div className="h-7 w-28 bg-slate-200 rounded" />
        </div>
      </div>

      {/* Date Range Toolbar Skeleton */}
      <div className="h-14 bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-7 w-16 bg-slate-100 rounded-md" />
          ))}
        </div>
        <div className="h-7 w-52 bg-slate-100 rounded-md" />
      </div>

      {/* Workbook Tab Bar Skeleton */}
      <div className="space-y-0">
        <div className="bg-slate-100 rounded-t-xl px-2 pt-2 flex gap-2 border border-b-0 border-slate-300/80">
          <div className="h-9 w-44 bg-white rounded-t-lg border-t-2 border-blue-500" />
          <div className="h-9 w-40 bg-slate-200/70 rounded-t-lg" />
          <div className="h-9 w-44 bg-slate-200/70 rounded-t-lg" />
        </div>

        {/* Sheet Content Skeleton */}
        <div className="bg-white border border-slate-300/80 rounded-b-xl p-6 space-y-6">
          <div className="h-20 bg-slate-50 rounded-xl border border-slate-200" />

          {/* 4 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-7 w-32 bg-slate-300 rounded" />
                <div className="h-3 w-full bg-slate-100 rounded" />
              </div>
            ))}
          </div>

          {/* 3 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-7 w-32 bg-slate-300 rounded" />
                <div className="h-3 w-full bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
