'use client';

import React from 'react';
import type { HubPLRow, DateRangeFilter } from '@/lib/db/financials';
import { HubPLTable } from './hub-pl-table';

interface HubPLTabProps {
  hubRows: HubPLRow[];
  dateRange?: DateRangeFilter;
}

export function HubPLTab({ hubRows, dateRange }: HubPLTabProps) {
  return (
    <div className="space-y-6">
      <HubPLTable hubRows={hubRows} dateRange={dateRange} />
    </div>
  );
}
