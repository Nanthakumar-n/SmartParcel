import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: {
    transport: WebSocket,
  },
});

async function seed() {
  console.log('Seeding complete test dataset...');

  // 1. Tenant
  let tenantId: string;
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', 'patel-roadways')
    .maybeSingle();

  if (existingTenant) {
    tenantId = existingTenant.id;
  } else {
    const { data: newTenant, error: tErr } = await supabase
      .from('tenants')
      .insert({
        name: 'Patel Roadways',
        slug: 'patel-roadways',
        contact_phone: '+919876543210',
        address_line1: '10 Transport Nagar',
        city: 'Mumbai',
        state: 'Maharashtra',
        pin_code: '400001',
      })
      .select('id')
      .single();

    if (tErr || !newTenant) {
      console.error('Error creating tenant:', tErr);
      process.exit(1);
    }
    tenantId = newTenant.id;
  }

  // 2. Fleet Owner User
  const email = 'kishore@patelroadways.com';
  const password = 'Password123!';

  const { data: userList } = await supabase.auth.admin.listUsers();
  const existingUser = userList?.users.find((u) => u.email === email);

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
    await supabase.auth.admin.updateUserById(userId, {
      password,
      user_metadata: {
        full_name: 'Kishore Patel',
        phone: '+919876543210',
        user_role: 'fleet_owner',
        tenant_id: tenantId,
      },
      app_metadata: {
        user_role: 'fleet_owner',
        tenant_id: tenantId,
      },
    });
  } else {
    const { data: newUser, error: uErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Kishore Patel',
        phone: '+919876543210',
        user_role: 'fleet_owner',
        tenant_id: tenantId,
      },
      app_metadata: {
        user_role: 'fleet_owner',
        tenant_id: tenantId,
      },
    });

    if (uErr || !newUser.user) {
      console.error('Error creating user:', uErr);
      process.exit(1);
    }
    userId = newUser.user.id;
  }

  await supabase.from('users').upsert({
    id: userId,
    email,
    phone: '+919876543210',
    full_name: 'Kishore Patel',
    user_role: 'fleet_owner',
    tenant_id: tenantId,
    is_active: true,
  });

  // 3. Seed Hubs
  const hubs = [
    {
      tenant_id: tenantId,
      hub_code: 'MUM',
      name: 'Mumbai Central Hub',
      address_line1: 'Plot 42, Transport Nagar, Bhiwandi',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin_code: '400001',
      contact_phone: '+919876543210',
      is_active: true,
    },
    {
      tenant_id: tenantId,
      hub_code: 'DEL',
      name: 'Delhi North Hub',
      address_line1: 'Sanjay Gandhi Transport Nagar',
      city: 'Delhi',
      state: 'Delhi',
      pin_code: '110001',
      contact_phone: '+919876543211',
      is_active: true,
    },
    {
      tenant_id: tenantId,
      hub_code: 'BLR',
      name: 'Bangalore Electronic City Hub',
      address_line1: 'Hosur Road, Electronic City',
      city: 'Bangalore',
      state: 'Karnataka',
      pin_code: '560100',
      contact_phone: '+919876543212',
      is_active: true,
    },
  ];

  for (const hub of hubs) {
    const { data: existingHub } = await supabase
      .from('hubs')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('hub_code', hub.hub_code)
      .maybeSingle();

    if (!existingHub) {
      await supabase.from('hubs').insert(hub);
    }
  }

  // 4. Seed Drivers
  const drivers = [
    {
      tenant_id: tenantId,
      full_name: 'Ramesh Kumar',
      phone: '+919876543220',
      license_number: 'DL-1420110012345',
      is_active: true,
    },
    {
      tenant_id: tenantId,
      full_name: 'Suresh Singh',
      phone: '+919876543221',
      license_number: 'MH-0120150098765',
      is_active: true,
    },
    {
      tenant_id: tenantId,
      full_name: 'Vijay Verma',
      phone: '+919876543222',
      license_number: 'KA-0420180054321',
      is_active: true,
    },
  ];

  const driverMap = new Map<string, string>();
  for (const driver of drivers) {
    const { data: existingDriver } = await supabase
      .from('drivers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone', driver.phone)
      .maybeSingle();

    if (existingDriver) {
      driverMap.set(driver.full_name, existingDriver.id);
    } else {
      const { data: newDriver } = await supabase
        .from('drivers')
        .insert(driver)
        .select('id')
        .single();
      if (newDriver) {
        driverMap.set(driver.full_name, newDriver.id);
      }
    }
  }

  // 5. Seed Vehicles
  const vehicles = [
    {
      tenant_id: tenantId,
      registration_number: 'MH 12 AB 1234',
      vehicle_type: 'TRUCK',
      capacity_tonnes: 10.5,
      default_driver_id: driverMap.get('Ramesh Kumar') || null,
      status: 'AVAILABLE',
      is_active: true,
    },
    {
      tenant_id: tenantId,
      registration_number: 'DL 01 CD 5678',
      vehicle_type: 'TEMPO',
      capacity_tonnes: 2.5,
      default_driver_id: driverMap.get('Suresh Singh') || null,
      status: 'AVAILABLE',
      is_active: true,
    },
    {
      tenant_id: tenantId,
      registration_number: 'KA 04 EF 9012',
      vehicle_type: 'MINI_TRUCK',
      capacity_tonnes: 5.0,
      default_driver_id: driverMap.get('Vijay Verma') || null,
      status: 'IN_TRANSIT',
      is_active: true,
    },
  ];

  for (const vehicle of vehicles) {
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('registration_number', vehicle.registration_number)
      .maybeSingle();

    if (!existingVehicle) {
      await supabase.from('vehicles').insert(vehicle);
    }
  }

  console.log('✅ Full seed complete!');
}

seed();
