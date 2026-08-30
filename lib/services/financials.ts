import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';
import {
  getFleetPL,
  getHubPL,
  getHubReceivables,
  getTripPLByTenant,
  type DateRangeFilter,
  type FleetPLMetrics,
  type HubPLRow,
  type HubReceivableLR,
  type TripPLRow,
} from '@/lib/db/financials';
import { actionSuccess, formError, type ActionResult } from '@/lib/types/action-result';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Service to fetch Fleet P&L metrics with security and validation.
 */
export async function getFleetPLService(
  supabase: AnySupabaseClient,
  dateRange?: DateRangeFilter
): Promise<ActionResult<FleetPLMetrics>> {
  try {
    const data = await getFleetPL(supabase, dateRange);
    return actionSuccess(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to calculate Fleet P&L';
    return formError(msg);
  }
}

/**
 * Service to fetch Hub P&L breakdown.
 */
export async function getHubPLService(
  supabase: AnySupabaseClient,
  dateRange?: DateRangeFilter
): Promise<ActionResult<HubPLRow[]>> {
  try {
    const data = await getHubPL(supabase, dateRange);
    return actionSuccess(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to calculate Hub P&L';
    return formError(msg);
  }
}

/**
 * Service to fetch Hub Receivables.
 */
export async function getHubReceivablesService(
  supabase: AnySupabaseClient,
  hubId: string,
  dateRange?: DateRangeFilter
): Promise<ActionResult<HubReceivableLR[]>> {
  try {
    if (!hubId) {
      return formError('Hub ID is required');
    }
    const data = await getHubReceivables(supabase, hubId, dateRange);
    return actionSuccess(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch hub receivables';
    return formError(msg);
  }
}

/**
 * Service to fetch Trip P&L.
 */
export async function getTripPLService(
  supabase: AnySupabaseClient,
  dateRange?: DateRangeFilter,
  options?: {
    search?: string;
    hubId?: string;
  }
): Promise<ActionResult<TripPLRow[]>> {
  try {
    const data = await getTripPLByTenant(supabase, dateRange, options);
    return actionSuccess(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to calculate Trip P&L';
    return formError(msg);
  }
}
