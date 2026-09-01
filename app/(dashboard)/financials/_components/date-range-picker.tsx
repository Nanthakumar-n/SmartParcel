'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Filter, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DatePreset = 'today' | 'week' | 'month' | 'last_month' | 'quarter' | 'year' | 'all' | 'custom';

interface DateRangePickerProps {
  currentPreset?: DatePreset;
  dateFrom?: string;
  dateTo?: string;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateRangePicker({
  currentPreset = 'month',
  dateFrom = '',
  dateTo = '',
}: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [preset, setPreset] = React.useState<DatePreset>(currentPreset);
  const [customFrom, setCustomFrom] = React.useState(dateFrom);
  const [customTo, setCustomTo] = React.useState(dateTo);

  const applyRange = (newPreset: DatePreset, from: string, to: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', newPreset);
    if (from) params.set('from', from);
    else params.delete('from');
    if (to) params.set('to', to);
    else params.delete('to');

    setPreset(newPreset);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePresetClick = (p: DatePreset) => {
    const now = new Date();
    let from = '';
    let to = '';

    if (p === 'today') {
      from = formatDate(now);
      to = formatDate(now);
    } else if (p === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      from = formatDate(monday);
      to = formatDate(new Date());
    } else if (p === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      from = formatDate(firstDay);
      to = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (p === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      from = formatDate(firstDay);
      to = formatDate(lastDay);
    } else if (p === 'quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const firstDay = new Date(now.getFullYear(), quarterMonth, 1);
      const lastDay = new Date(now.getFullYear(), quarterMonth + 3, 0);
      from = formatDate(firstDay);
      to = formatDate(lastDay);
    } else if (p === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      from = formatDate(firstDay);
      to = formatDate(lastDay);
    } else if (p === 'all') {
      from = '';
      to = '';
    }

    setCustomFrom(from);
    setCustomTo(to);
    applyRange(p, from, to);
  };

  const handleCustomApply = () => {
    applyRange('custom', customFrom, customTo);
  };

  const presets: { id: DatePreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'quarter', label: 'Quarter' },
    { id: 'year', label: 'FY / Year' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
      {/* Presets List */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
        <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 shrink-0 select-none">
          <Filter className="h-3.5 w-3.5 text-blue-600" />
          <span>Interval</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60">
          {presets.map((item) => {
            const isSelected = preset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePresetClick(item.id)}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-all shrink-0 select-none',
                  isSelected
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Inputs */}
      <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-6 text-xs w-28 px-1 bg-transparent border-0 shadow-none font-mono focus-visible:ring-0"
            aria-label="Start date"
          />
          <span className="text-slate-400 text-xs px-0.5">&rarr;</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-6 text-xs w-28 px-1 bg-transparent border-0 shadow-none font-mono focus-visible:ring-0"
            aria-label="End date"
          />
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleCustomApply}
          className="text-xs h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-2xs gap-1"
        >
          <span>Apply</span>
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
