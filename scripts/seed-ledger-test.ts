import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
});

async function main() {
  console.log('Seeding backend trip & LRs for ledger testing...');

  // 1. Get tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', 'patel-roadways')
    .single();

  if (!tenant) throw new Error('Tenant not found. Run seed-dev.ts first.');
  const tenantId = tenant.id;

  // 2. Get Mumbai and Delhi hubs
  const { data: hubs } = await supabase
    .from('hubs')
    .select('id, hub_code')
    .eq('tenant_id', tenantId);

  const mumHub = hubs?.find((h) => h.hub_code === 'MUM');
  const delHub = hubs?.find((h) => h.hub_code === 'DEL');
  if (!mumHub || !delHub) throw new Error('MUM or DEL hub not found.');

  // 3. Get Vehicle and Driver
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
    .single();

  const { data: driver } = await supabase
    .from('drivers')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
    .single();

  // 4. Create Trip
  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .insert({
      tenant_id: tenantId,
      from_hub_id: mumHub.id,
      to_hub_id: delHub.id,
      vehicle_id: vehicle?.id || null,
      driver_id: driver?.id || null,
      status: 'SCHEDULED',
      scheduled_departure: new Date(Date.now() + 86400000).toISOString(),
    })
    .select()
    .single();

  if (tripErr) throw tripErr;
  console.log('Created test trip:', trip.id);

  // 5. Create 2 LRs and assign to trip
  const year = new Date().getFullYear();
  for (let i = 1; i <= 2; i++) {
    const lrNumber = `MUM-${year}-${String(Math.floor(100000 + Math.random() * 900000))}`;
    await supabase.from('lorry_receipts').insert({
      tenant_id: tenantId,
      lr_number: lrNumber,
      from_hub_id: mumHub.id,
      to_hub_id: delHub.id,
      trip_id: trip.id,
      booking_date: new Date().toISOString().split('T')[0],
      consignor_name: `Shipper Corp ${i}`,
      consignor_phone: '+919876543210',
      consignee_name: `Receiver Corp ${i}`,
      consignee_phone: '+919876543211',
      goods_description: 'Electronic components and garments',
      quantity: 10,
      weight_kg: 500,
      num_packages: 5,
      freight_amount: 1500000, // ₹15,000 in paise
      payment_mode: 'TO_PAY',
      status: 'BOOKED',
    });
  }

  console.log('✅ Trip and LRs seeded successfully!');
}

main().catch(console.error);
