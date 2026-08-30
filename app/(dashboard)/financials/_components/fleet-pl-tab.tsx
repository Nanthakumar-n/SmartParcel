'use client';

import React from 'react';
import type { FleetPLMetrics } from '@/lib/db/financials';
import { FleetSummaryCards } from './fleet-summary-cards';

interface FleetPLTabProps {
  metrics: FleetPLMetrics;
}

export function FleetPLTab({ metrics }: FleetPLTabProps) {
  return (
    <div className="space-y-6">
      <FleetSummaryCards metrics={metrics} />
    </div>
  );
}
