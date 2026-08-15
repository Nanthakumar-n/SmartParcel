'use client';

import React from 'react';
import { DAYS_OF_WEEK } from '@/lib/validations/trip-schedule';
import { cn } from '@/lib/utils';

interface DaySelectorProps {
  value: number[];
  onChange: (days: number[]) => void;
  disabled?: boolean;
}

export function DaySelector({ value = [], onChange, disabled }: DaySelectorProps) {
  const toggleDay = (dayVal: number) => {
    if (value.includes(dayVal)) {
      onChange(value.filter((d) => d !== dayVal));
    } else {
      onChange([...value, dayVal].sort((a, b) => a - b));
    }
  };

  const selectAll = () => {
    onChange([0, 1, 2, 3, 4, 5, 6]);
  };

  const selectWeekdays = () => {
    onChange([1, 2, 3, 4, 5]);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Select operating days:</span>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={selectWeekdays}
            className="text-blue-600 hover:underline font-medium"
            disabled={disabled}
          >
            Weekdays
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={selectAll}
            className="text-blue-600 hover:underline font-medium"
            disabled={disabled}
          >
            Daily
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-slate-500 hover:underline"
            disabled={disabled}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = value.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              disabled={disabled}
              onClick={() => toggleDay(day.value)}
              className={cn(
                'py-2 px-1 text-xs font-semibold rounded-md border transition-all text-center flex flex-col items-center justify-center gap-0.5',
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <span>{day.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
