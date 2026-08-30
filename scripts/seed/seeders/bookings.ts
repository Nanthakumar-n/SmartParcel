import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/types/supabase';
import { logSuccess } from '../utils/logger';

export interface SeededBookingRequest {
  id: string;
  bookingRef: string;
  status: string;
  originCity: string;
  destinationCity: string;
  customerName: string;
  customerPhone: string;
  goodsDescription: string;
  weightKg: number;
  numPackages: number;
}

export async function seedBookingRequests(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  tenantSlug: string,
  hubMap: Map<string, string>
): Promise<SeededBookingRequest[]> {
  const mumHubId = hubMap.get('MUM') ?? null;
  const delHubId = hubMap.get('DEL') ?? null;
  const blrHubId = hubMap.get('BLR') ?? null;

  const currentYear = new Date().getFullYear();
  const randSuffix = () => Math.floor(100 + Math.random() * 900);

  const requestsToInsert = [
    {
      tenant_id: tenantId,
      tenant_slug: tenantSlug,
      booking_ref: `BK-MUM-${currentYear}-${randSuffix()}`,
      customer_name: 'Aditya Birla Chemicals Ltd',
      customer_phone: '+919820554433',
      origin_city: 'Mumbai',
      destination_city: 'Delhi',
      assigned_hub_id: mumHubId,
      goods_description: 'Industrial Chemical Additives (Non-Hazardous drums)',
      num_packages: 10,
      weight_kg: 750,
      quantity: 10,
      consignor_address_line1: 'Century Bhavan, Dr. Annie Besant Road, Worli',
      consignor_pin_code: '400030',
      consignee_name: 'Delhi Chemical Distributors',
      consignee_phone: '+919811443322',
      consignee_address_line1: 'Plot 55, Tilak Bazar, Khari Baoli',
      consignee_pin_code: '110006',
      status: 'PENDING',
      notes: 'Urgent consignment — please schedule on the next available Mumbai-Delhi truck.',
    },
    {
      tenant_id: tenantId,
      tenant_slug: tenantSlug,
      booking_ref: `BK-DEL-${currentYear}-${randSuffix()}`,
      customer_name: 'V-Guard Industries Ltd',
      customer_phone: '+919811667788',
      origin_city: 'Delhi',
      destination_city: 'Bangalore',
      assigned_hub_id: delHubId,
      goods_description: 'Electrical Inverters & Voltage Stabilizers',
      num_packages: 20,
      weight_kg: 420,
      quantity: 20,
      consignor_address_line1: 'Industrial Area Phase 1, Mayapuri',
      consignor_pin_code: '110064',
      consignee_name: 'Bangalore Power Systems Hub',
      consignee_phone: '+919845332211',
      consignee_address_line1: 'Rajajinagar Industrial Town',
      consignee_pin_code: '560044',
      status: 'PENDING',
      notes: 'Fragile electronics — handle with care.',
    },
    {
      tenant_id: tenantId,
      tenant_slug: tenantSlug,
      booking_ref: `BK-BLR-${currentYear}-${randSuffix()}`,
      customer_name: 'Karnataka Silk Industries Corp',
      customer_phone: '+919880112233',
      origin_city: 'Bangalore',
      destination_city: 'Mumbai',
      assigned_hub_id: blrHubId,
      goods_description: 'Raw Silk Yarn & Jacquard Weaving Rolls',
      num_packages: 15,
      weight_kg: 600,
      quantity: 15,
      consignor_address_line1: 'Devanahalli Silk Tech Park',
      consignor_pin_code: '562110',
      consignee_name: 'Bhiwandi Powerloom Alliance',
      consignee_phone: '+919821887766',
      consignee_address_line1: 'Dhamankar Naka, Bhiwandi',
      consignee_pin_code: '421302',
      status: 'REJECTED',
      rejection_reason: 'Destination hub capacity currently full for textile cargo this week.',
      notes: 'Customer notified via phone.',
    },
  ];

  const { data: inserted, error } = await supabase
    .from('booking_requests')
    .insert(requestsToInsert)
    .select('id, booking_ref, status, origin_city, destination_city, customer_name, customer_phone, goods_description, weight_kg, num_packages');

  if (error || !inserted) {
    throw new Error(`Failed to seed booking requests: ${error?.message}`);
  }

  logSuccess(`Seeded ${inserted.length} Online Customer Booking Requests (2 PENDING, 1 REJECTED).`);

  return inserted.map((r) => ({
    id: r.id,
    bookingRef: r.booking_ref,
    status: r.status,
    originCity: r.origin_city,
    destinationCity: r.destination_city,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    goodsDescription: r.goods_description,
    weightKg: r.weight_kg ?? 500,
    numPackages: r.num_packages ?? 10,
  }));
}
