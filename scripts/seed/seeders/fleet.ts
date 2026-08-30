import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/types/supabase';
import { DRIVER_FIXTURES, VEHICLE_FIXTURES } from '../fixtures';
import { logSuccess } from '../utils/logger';

export interface SeededFleet {
  drivers: Map<string, string>; // name -> driver_id
  vehicles: Map<string, string>; // reg_num -> vehicle_id
}

export async function seedFleet(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  hubMap: Map<string, string> // hub_code -> hub_id
): Promise<SeededFleet> {
  const driverMap = new Map<string, string>();
  const vehicleMap = new Map<string, string>();

  // 1. Seed Drivers
  for (const driverFixture of DRIVER_FIXTURES) {
    const { data: existingDriver } = await supabase
      .from('drivers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone', driverFixture.phone)
      .maybeSingle();

    let driverId: string;
    if (existingDriver) {
      driverId = existingDriver.id;
      await supabase
        .from('drivers')
        .update({
          full_name: driverFixture.full_name,
          license_number: driverFixture.license_number,
          is_active: true,
        })
        .eq('id', driverId);
    } else {
      const { data: createdDriver, error: dErr } = await supabase
        .from('drivers')
        .insert({
          tenant_id: tenantId,
          full_name: driverFixture.full_name,
          phone: driverFixture.phone,
          license_number: driverFixture.license_number,
          is_active: true,
        })
        .select('id')
        .single();

      if (dErr || !createdDriver) {
        throw new Error(`Failed to create driver ${driverFixture.full_name}: ${dErr?.message}`);
      }
      driverId = createdDriver.id;
    }
    driverMap.set(driverFixture.full_name, driverId);
  }

  // 2. Seed Vehicles
  for (const vehicleFixture of VEHICLE_FIXTURES) {
    const driverId = driverMap.get(vehicleFixture.defaultDriverName) ?? null;
    const hubId = hubMap.get(vehicleFixture.initialHubCode) ?? null;

    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('registration_number', vehicleFixture.registration_number)
      .maybeSingle();

    let vehicleId: string;
    if (existingVehicle) {
      vehicleId = existingVehicle.id;
      await supabase
        .from('vehicles')
        .update({
          vehicle_type: vehicleFixture.vehicle_type,
          capacity_tonnes: vehicleFixture.capacity_tonnes,
          default_driver_id: driverId,
          current_hub_id: hubId,
          status: 'AVAILABLE',
          is_active: true,
        })
        .eq('id', vehicleId);
    } else {
      const { data: createdVehicle, error: vErr } = await supabase
        .from('vehicles')
        .insert({
          tenant_id: tenantId,
          registration_number: vehicleFixture.registration_number,
          vehicle_type: vehicleFixture.vehicle_type,
          capacity_tonnes: vehicleFixture.capacity_tonnes,
          default_driver_id: driverId,
          current_hub_id: hubId,
          status: 'AVAILABLE',
          is_active: true,
        })
        .select('id')
        .single();

      if (vErr || !createdVehicle) {
        throw new Error(
          `Failed to create vehicle ${vehicleFixture.registration_number}: ${vErr?.message}`
        );
      }
      vehicleId = createdVehicle.id;
    }
    vehicleMap.set(vehicleFixture.registration_number, vehicleId);
  }

  logSuccess(`Seeded ${driverMap.size} Drivers and ${vehicleMap.size} Fleet Vehicles.`);
  return { drivers: driverMap, vehicles: vehicleMap };
}
