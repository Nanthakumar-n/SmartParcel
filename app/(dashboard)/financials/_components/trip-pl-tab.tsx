'use client';

import React from 'react';
import type { TripPLRow } from '@/lib/db/financials';
import { TripPLTable } from './trip-pl-table';

interface TripPLTabProps {
  trips: TripPLRow[];
}

export function TripPLTab({ trips }: TripPLTabProps) {
  return (
    <div className="space-y-6">
      <TripPLTable trips={trips} />
    </div>
  );
}
