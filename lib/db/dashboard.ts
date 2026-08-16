import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export interface DashboardMetrics {
  activeLRCount: number;
  totalLRCount: number;
  inTransitLRCount: number;
  deliveredLRCount: number;
  pendingBookingsCount: number;
  activeVehiclesCount: number;
  inTransitVehiclesCount: number;
  operationalHubsCount: number;
  activeDriversCount: number;
  activeTripsCount: number;
  monthlyFreightPaise: number;
  onboardingStatus: {
    hasWorkspace: boolean;
    hasHubs: boolean;
    hasVehicles: boolean;
    hasDrivers: boolean;
    isSetupComplete: boolean;
    completedSteps: number;
    totalSteps: number;
  };
}

/**
 * Fetch all dashboard aggregates and metrics for the authenticated tenant in parallel.
 */
export async function getDashboardMetrics(
  supabase: AnySupabaseClient
): Promise<DashboardMetrics> {
  // Current month string formatted as YYYY-MM-01
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const firstDayOfMonth = `${year}-${month}-01`;

  const [
    activeLrsRes,
    totalLrsRes,
    inTransitLrsRes,
    deliveredLrsRes,
    pendingBookingsRes,
    activeVehiclesRes,
    inTransitVehiclesRes,
    operationalHubsRes,
    activeDriversRes,
    activeTripsRes,
    monthlyFreightLrsRes,
  ] = await Promise.all([
    // Active LRs in system (in pipeline, excluding terminal DELIVERED and CANCELLED)
    supabase
      .from('lorry_receipts')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '("DELIVERED","CANCELLED")'),

    // Total LRs issued
    supabase
      .from('lorry_receipts')
      .select('id', { count: 'exact', head: true }),

    // LRs In Transit
    supabase
      .from('lorry_receipts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'IN_TRANSIT'),

    // LRs Delivered
    supabase
      .from('lorry_receipts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'DELIVERED'),

    // Pending customer booking requests
    supabase
      .from('booking_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING'),

    // Active fleet vehicles
    supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // Vehicles currently in transit
    supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'IN_TRANSIT')
      .eq('is_active', true),

    // Active branch hubs
    supabase
      .from('hubs')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // Active drivers
    supabase
      .from('drivers')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // Active trips (SCHEDULED or IN_TRANSIT)
    supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .in('status', ['SCHEDULED', 'IN_TRANSIT']),

    // Monthly freight value (sum of freight_amount for non-cancelled LRs booked this month)
    supabase
      .from('lorry_receipts')
      .select('freight_amount')
      .gte('booking_date', firstDayOfMonth)
      .neq('status', 'CANCELLED'),
  ]);

  const activeLRCount = activeLrsRes.count ?? 0;
  const totalLRCount = totalLrsRes.count ?? 0;
  const inTransitLRCount = inTransitLrsRes.count ?? 0;
  const deliveredLRCount = deliveredLrsRes.count ?? 0;
  const pendingBookingsCount = pendingBookingsRes.count ?? 0;
  const activeVehiclesCount = activeVehiclesRes.count ?? 0;
  const inTransitVehiclesCount = inTransitVehiclesRes.count ?? 0;
  const operationalHubsCount = operationalHubsRes.count ?? 0;
  const activeDriversCount = activeDriversRes.count ?? 0;
  const activeTripsCount = activeTripsRes.count ?? 0;

  // Calculate monthly freight amount in paise
  const monthlyFreightRows = monthlyFreightLrsRes.data ?? [];
  const monthlyFreightPaise = monthlyFreightRows.reduce(
    (acc, row) => acc + (Number(row.freight_amount) || 0),
    0
  );

  // Setup completion criteria:
  // Step 1: Workspace is always complete if tenant exists
  // Step 2: Hubs (at least 1 hub)
  // Step 3: Vehicles (at least 1 vehicle)
  // Step 4: Drivers (at least 1 driver)
  const hasWorkspace = true;
  const hasHubs = operationalHubsCount > 0;
  const hasVehicles = activeVehiclesCount > 0;
  const hasDrivers = activeDriversCount > 0;
  const isSetupComplete = hasHubs && hasVehicles && hasDrivers;

  const completedSteps =
    (hasWorkspace ? 1 : 0) +
    (hasHubs ? 1 : 0) +
    (hasVehicles ? 1 : 0) +
    (hasDrivers ? 1 : 0);

  return {
    activeLRCount,
    totalLRCount,
    inTransitLRCount,
    deliveredLRCount,
    pendingBookingsCount,
    activeVehiclesCount,
    inTransitVehiclesCount,
    operationalHubsCount,
    activeDriversCount,
    activeTripsCount,
    monthlyFreightPaise,
    onboardingStatus: {
      hasWorkspace,
      hasHubs,
      hasVehicles,
      hasDrivers,
      isSetupComplete,
      completedSteps,
      totalSteps: 4,
    },
  };
}
