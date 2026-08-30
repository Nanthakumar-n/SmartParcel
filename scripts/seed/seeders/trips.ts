import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/types/supabase';
import { logSuccess } from '../utils/logger';

export interface SeededTrip {
  id: string;
  scenarioKey: 'scheduled_mum_del' | 'intransit_mum_blr' | 'completed_del_mum_settled' | 'completed_blr_mum_unsettled';
  fromHubCode: string;
  toHubCode: string;
  fromHubId: string;
  toHubId: string;
  vehicleId: string | null;
  driverId: string | null;
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'COMPLETED';
}

export async function seedTrips(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  hubMap: Map<string, string>,
  vehicleMap: Map<string, string>,
  driverMap: Map<string, string>,
  userId: string,
  preset: 'full' | 'ops' = 'full'
): Promise<Map<string, SeededTrip>> {
  const mumHubId = hubMap.get('MUM')!;
  const delHubId = hubMap.get('DEL')!;
  const blrHubId = hubMap.get('BLR')!;

  const v1 = vehicleMap.get('MH 12 AB 1234')!; // Truck
  const v2 = vehicleMap.get('DL 01 CD 5678')!; // Tempo
  const v3 = vehicleMap.get('KA 04 EF 9012')!; // Container
  const v4 = vehicleMap.get('MH 04 GH 3456')!; // Trailer

  const d1 = driverMap.get('Ramesh Kumar')!;
  const d2 = driverMap.get('Suresh Singh')!;
  const d3 = driverMap.get('Vijay Verma')!;
  const d4 = driverMap.get('Gurpreet Singh')!;

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 72 * 3600 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

  const allTripConfigs = [
    {
      scenarioKey: 'scheduled_mum_del' as const,
      fromHubCode: 'MUM',
      toHubCode: 'DEL',
      from_hub_id: mumHubId,
      to_hub_id: delHubId,
      vehicle_id: v4,
      driver_id: d4,
      status: 'SCHEDULED',
      scheduled_departure: tomorrow,
      notes: 'Scheduled Mumbai ➔ Delhi highway route dispatch.',
    },
    {
      scenarioKey: 'intransit_mum_blr' as const,
      fromHubCode: 'MUM',
      toHubCode: 'BLR',
      from_hub_id: mumHubId,
      to_hub_id: blrHubId,
      vehicle_id: v1,
      driver_id: d1,
      status: 'IN_TRANSIT',
      scheduled_departure: yesterday,
      dispatched_at: yesterday,
      notes: 'Active in-transit trip Mumbai ➔ Bangalore carrying industrial materials.',
    },
    {
      scenarioKey: 'completed_del_mum_settled' as const,
      fromHubCode: 'DEL',
      toHubCode: 'MUM',
      from_hub_id: delHubId,
      to_hub_id: mumHubId,
      vehicle_id: v2,
      driver_id: d2,
      status: 'COMPLETED',
      scheduled_departure: threeDaysAgo,
      dispatched_at: threeDaysAgo,
      completed_at: yesterday,
      notes: 'Completed delivery Delhi ➔ Mumbai. Expense ledger settled.',
    },
    {
      scenarioKey: 'completed_blr_mum_unsettled' as const,
      fromHubCode: 'BLR',
      toHubCode: 'MUM',
      from_hub_id: blrHubId,
      to_hub_id: mumHubId,
      vehicle_id: v3,
      driver_id: d3,
      status: 'COMPLETED',
      scheduled_departure: twoDaysAgo,
      dispatched_at: twoDaysAgo,
      completed_at: now.toISOString(),
      notes: 'Arrived at Mumbai hub. Pending expense settlement by Fleet Owner.',
    },
  ];

  const tripConfigs =
    preset === 'ops'
      ? allTripConfigs.filter((c) => c.status === 'SCHEDULED' || c.status === 'IN_TRANSIT')
      : allTripConfigs;

  const tripsMap = new Map<string, SeededTrip>();

  for (const config of tripConfigs) {
    const { data: created, error } = await supabase
      .from('trips')
      .insert({
        tenant_id: tenantId,
        from_hub_id: config.from_hub_id,
        to_hub_id: config.to_hub_id,
        vehicle_id: config.vehicle_id,
        driver_id: config.driver_id,
        status: config.status,
        scheduled_departure: config.scheduled_departure,
        dispatched_at: config.dispatched_at ?? null,
        completed_at: config.completed_at ?? null,
        created_by: userId,
        notes: config.notes,
      })
      .select('id, from_hub_id, to_hub_id, vehicle_id, driver_id, status')
      .single();

    if (error || !created) {
      throw new Error(`Failed to create trip ${config.scenarioKey}: ${error?.message}`);
    }

    tripsMap.set(config.scenarioKey, {
      id: created.id,
      scenarioKey: config.scenarioKey,
      fromHubCode: config.fromHubCode,
      toHubCode: config.toHubCode,
      fromHubId: created.from_hub_id,
      toHubId: created.to_hub_id,
      vehicleId: created.vehicle_id,
      driverId: created.driver_id,
      status: created.status as 'SCHEDULED' | 'IN_TRANSIT' | 'COMPLETED',
    });
  }

  // Update vehicle statuses & current locations to reflect trip states
  // 1. v1 (in-transit): status = IN_TRANSIT
  await supabase.from('vehicles').update({ status: 'IN_TRANSIT' }).eq('id', v1);

  // 2. v2 (completed DEL->MUM): current_hub_id = MUM, status = AVAILABLE
  await supabase.from('vehicles').update({ current_hub_id: mumHubId, status: 'AVAILABLE' }).eq('id', v2);

  // 3. v3 (completed BLR->MUM): current_hub_id = MUM, status = AVAILABLE
  await supabase.from('vehicles').update({ current_hub_id: mumHubId, status: 'AVAILABLE' }).eq('id', v3);

  // 4. v4 (scheduled at MUM): current_hub_id = MUM, status = AVAILABLE
  await supabase.from('vehicles').update({ current_hub_id: mumHubId, status: 'AVAILABLE' }).eq('id', v4);

  logSuccess(`Seeded ${tripsMap.size} Trips across lifecycle (1 SCHEDULED, 1 IN_TRANSIT, 2 COMPLETED) with vehicle status synchronization.`);
  return tripsMap;
}
