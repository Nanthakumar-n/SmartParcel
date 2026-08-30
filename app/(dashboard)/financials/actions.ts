'use server';

import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import {
  getFleetPLService,
  getHubPLService,
  getHubReceivablesService,
  getTripPLService,
} from '@/lib/services/financials';
import type { ActionResult } from '@/lib/types/action-result';
import type {
  FleetPLMetrics,
  HubPLRow,
  HubReceivableLR,
  TripPLRow,
  DateRangeFilter,
} from '@/lib/db/financials';

/**
 * Fetch Fleet P&L metrics (Fleet Owner only).
 */
export async function getFleetPLAction(
  dateRange?: DateRangeFilter
): Promise<ActionResult<FleetPLMetrics>> {
  await requireRole(['fleet_owner']);
  const supabase = createServerClient();
  return getFleetPLService(supabase, dateRange);
}

/**
 * Fetch Hub P&L breakdown (Fleet Owner only).
 */
export async function getHubPLAction(
  dateRange?: DateRangeFilter
): Promise<ActionResult<HubPLRow[]>> {
  await requireRole(['fleet_owner']);
  const supabase = createServerClient();
  return getHubPLService(supabase, dateRange);
}

/**
 * Fetch Hub Receivables (Fleet Owner only).
 */
export async function getHubReceivablesAction(
  hubId: string,
  dateRange?: DateRangeFilter
): Promise<ActionResult<HubReceivableLR[]>> {
  await requireRole(['fleet_owner']);
  const supabase = createServerClient();
  return getHubReceivablesService(supabase, hubId, dateRange);
}

/**
 * Fetch Trip P&L breakdown (Fleet Owner only).
 */
export async function getTripPLAction(
  dateRange?: DateRangeFilter,
  options?: {
    search?: string;
    hubId?: string;
  }
): Promise<ActionResult<TripPLRow[]>> {
  await requireRole(['fleet_owner']);
  const supabase = createServerClient();
  return getTripPLService(supabase, dateRange, options);
}
