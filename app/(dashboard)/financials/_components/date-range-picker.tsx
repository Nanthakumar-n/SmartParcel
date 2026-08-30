'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, RefreshCw } from 'lucide-react';

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
    { id: 'quarter', label: 'This Quarter' },
    { id: 'year', label: 'This Year' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
      {/* Presets List */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 mr-1.5 shrink-0">
          <Calendar className="h-3.5 w-3.5" />
          <span>Period:</span>
        </div>
        {presets.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={preset === item.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetClick(item.id)}
            className="text-xs h-7 px-2.5 shrink-0"
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* Custom Date Inputs */}
      <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
        <Input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="h-7 text-xs w-32 px-2"
          aria-label="Start date"
        />
        <span className="text-xs text-slate-400">to</span>
        <Input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          className="h-7 text-xs w-32 px-2"
          aria-label="End date"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCustomApply}
          className="text-xs h-7 px-2.5"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Apply
        </Button>
      </div>
    </div>
  );
}
