import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/types/supabase';
import {
  CARGO_TEMPLATES,
  CONSIGNEE_PROFILES,
  CONSIGNOR_PROFILES,
} from '../fixtures';
import { logSuccess } from '../utils/logger';
import type { SeededTrip } from './trips';

export interface SeededLR {
  id: string;
  lrNumber: string;
  status: string;
  paymentMode: string;
  freightAmountPaise: number;
  fromHubCode: string;
  toHubCode: string;
  tripId: string | null;
}

export interface LRSeedStats {
  totalLRs: number;
  pods: number;
  collections: number;
}

export async function seedLorryReceipts(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  hubMap: Map<string, string>,
  tripMap: Map<string, SeededTrip>,
  userId: string,
  preset: 'full' | 'ops' = 'full'
): Promise<LRSeedStats> {
  const mumHubId = hubMap.get('MUM')!;
  const delHubId = hubMap.get('DEL')!;
  const blrHubId = hubMap.get('BLR')!;

  const scheduledTrip = tripMap.get('scheduled_mum_del');
  const intransitTrip = tripMap.get('intransit_mum_blr');
  const completedSettledTrip = tripMap.get('completed_del_mum_settled');
  const completedUnsettledTrip = tripMap.get('completed_blr_mum_unsettled');

  const currentYear = new Date().getFullYear();
  let lrSequenceCounter = Math.floor(100000 + Math.random() * 800000);

  function nextLRNumber(hubCode: string): string {
    const seq = String(lrSequenceCounter++).padStart(6, '0');
    return `${hubCode}-${currentYear}-${seq}`;
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().split('T')[0];
  const twoDaysAgoStr = new Date(now.getTime() - 48 * 3600 * 1000).toISOString().split('T')[0];
  const threeDaysAgoStr = new Date(now.getTime() - 72 * 3600 * 1000).toISOString().split('T')[0];

  // LR Specs
  const allLrDefinitions = [
    // 1. Unassigned pool LRs at Mumbai hub (BOOKED, trip_id = null)
    {
      lrNumber: nextLRNumber('MUM'),
      fromHubId: mumHubId,
      toHubId: delHubId,
      fromHubCode: 'MUM',
      toHubCode: 'DEL',
      tripId: null,
      status: 'BOOKED',
      paymentMode: 'TO_PAY',
      consignor: CONSIGNOR_PROFILES[0],
      consignee: CONSIGNEE_PROFILES[0],
      cargo: CARGO_TEMPLATES[0],
      bookingDate: todayStr,
      historySteps: ['BOOKING_PENDING', 'BOOKED'],
    },
    {
      lrNumber: nextLRNumber('MUM'),
      fromHubId: mumHubId,
      toHubId: blrHubId,
      fromHubCode: 'MUM',
      toHubCode: 'BLR',
      tripId: null,
      status: 'BOOKED',
      paymentMode: 'PAID',
      consignor: CONSIGNOR_PROFILES[1],
      consignee: CONSIGNEE_PROFILES[1],
      cargo: CARGO_TEMPLATES[1],
      bookingDate: todayStr,
      historySteps: ['BOOKED'],
    },
    {
      lrNumber: nextLRNumber('MUM'),
      fromHubId: mumHubId,
      toHubId: delHubId,
      fromHubCode: 'MUM',
      toHubCode: 'DEL',
      tripId: null,
      status: 'BOOKED',
      paymentMode: 'TBB',
      consignor: CONSIGNOR_PROFILES[3],
      consignee: CONSIGNEE_PROFILES[2],
      cargo: CARGO_TEMPLATES[2],
      bookingDate: todayStr,
      historySteps: ['BOOKED'],
    },

    // 2. Assigned to SCHEDULED trip (MUM -> DEL)
    {
      lrNumber: nextLRNumber('MUM'),
      fromHubId: mumHubId,
      toHubId: delHubId,
      fromHubCode: 'MUM',
      toHubCode: 'DEL',
      tripId: scheduledTrip?.id ?? null,
      status: 'BOOKED',
      paymentMode: 'TO_PAY',
      consignor: CONSIGNOR_PROFILES[0],
      consignee: CONSIGNEE_PROFILES[3],
      cargo: CARGO_TEMPLATES[4],
      bookingDate: yesterdayStr,
      historySteps: ['BOOKED'],
    },
    {
      lrNumber: nextLRNumber('MUM'),
      fromHubId: mumHubId,
      toHubId: delHubId,
      fromHubCode: 'MUM',
      toHubCode: 'DEL',
      tripId: scheduledTrip?.id ?? null,
      status: 'BOOKED',
      paymentMode: 'PAID',
      consignor: CONSIGNOR_PROFILES[3],
      consignee: CONSIGNEE_PROFILES[0],
      cargo: CARGO_TEMPLATES[5],
      bookingDate: yesterdayStr,
      historySteps: ['BOOKED'],
    },

    // 3. Assigned to IN_TRANSIT trip (MUM -> BLR)
    {
      lrNumber: nextLRNumber('MUM'),
      fromHubId: mumHubId,
      toHubId: blrHubId,
      fromHubCode: 'MUM',
      toHubCode: 'BLR',
      tripId: intransitTrip?.id ?? null,
      status: 'IN_TRANSIT',
      paymentMode: 'TO_PAY',
      consignor: CONSIGNOR_PROFILES[1],
      consignee: CONSIGNEE_PROFILES[1],
      cargo: CARGO_TEMPLATES[0],
      bookingDate: yesterdayStr,
      historySteps: ['BOOKED', 'IN_TRANSIT'],
    },
    {
      lrNumber: nextLRNumber('MUM'),
      fromHubId: mumHubId,
      toHubId: blrHubId,
      fromHubCode: 'MUM',
      toHubCode: 'BLR',
      tripId: intransitTrip?.id ?? null,
      status: 'IN_TRANSIT',
      paymentMode: 'PAID',
      consignor: CONSIGNOR_PROFILES[3],
      consignee: CONSIGNEE_PROFILES[4],
      cargo: CARGO_TEMPLATES[1],
      bookingDate: yesterdayStr,
      historySteps: ['BOOKED', 'IN_TRANSIT'],
    },

    // 4. Assigned to COMPLETED trip (DEL -> MUM) — 1 ARRIVED, 1 DELIVERED
    {
      lrNumber: nextLRNumber('DEL'),
      fromHubId: delHubId,
      toHubId: mumHubId,
      fromHubCode: 'DEL',
      toHubCode: 'MUM',
      tripId: completedSettledTrip?.id ?? null,
      status: 'ARRIVED',
      paymentMode: 'TO_PAY',
      consignor: CONSIGNOR_PROFILES[2],
      consignee: CONSIGNEE_PROFILES[2],
      cargo: CARGO_TEMPLATES[2],
      bookingDate: threeDaysAgoStr,
      historySteps: ['BOOKED', 'IN_TRANSIT', 'ARRIVED'],
    },
    {
      lrNumber: nextLRNumber('DEL'),
      fromHubId: delHubId,
      toHubId: mumHubId,
      fromHubCode: 'DEL',
      toHubCode: 'MUM',
      tripId: completedSettledTrip?.id ?? null,
      status: 'DELIVERED',
      paymentMode: 'TO_PAY',
      consignor: CONSIGNOR_PROFILES[2],
      consignee: CONSIGNEE_PROFILES[0],
      cargo: CARGO_TEMPLATES[3],
      bookingDate: threeDaysAgoStr,
      historySteps: ['BOOKED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'],
      podReceiver: 'Mr. Arvind Gupta (Store Manager)',
      isToPayCollected: true,
      collectionPaymentMode: 'UPI',
    },

    // 5. Assigned to COMPLETED trip (BLR -> MUM) — 1 ARRIVED, 1 DELIVERED (PAID)
    {
      lrNumber: nextLRNumber('BLR'),
      fromHubId: blrHubId,
      toHubId: mumHubId,
      fromHubCode: 'BLR',
      toHubCode: 'MUM',
      tripId: completedUnsettledTrip?.id ?? null,
      status: 'ARRIVED',
      paymentMode: 'PAID',
      consignor: CONSIGNOR_PROFILES[4],
      consignee: CONSIGNEE_PROFILES[2],
      cargo: CARGO_TEMPLATES[4],
      bookingDate: twoDaysAgoStr,
      historySteps: ['BOOKED', 'IN_TRANSIT', 'ARRIVED'],
    },
    {
      lrNumber: nextLRNumber('BLR'),
      fromHubId: blrHubId,
      toHubId: mumHubId,
      fromHubCode: 'BLR',
      toHubCode: 'MUM',
      tripId: completedUnsettledTrip?.id ?? null,
      status: 'DELIVERED',
      paymentMode: 'PAID',
      consignor: CONSIGNOR_PROFILES[4],
      consignee: CONSIGNEE_PROFILES[1],
      cargo: CARGO_TEMPLATES[5],
      bookingDate: twoDaysAgoStr,
      historySteps: ['BOOKED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'],
      podReceiver: 'Kalyani Forge Gate Incharge - Vinod',
      isToPayCollected: false,
    },

    // 6. CANCELLED LR (with audit reason)
    {
      lrNumber: nextLRNumber('MUM'),
      fromHubId: mumHubId,
      toHubId: delHubId,
      fromHubCode: 'MUM',
      toHubCode: 'DEL',
      tripId: null,
      status: 'CANCELLED',
      paymentMode: 'TO_PAY',
      consignor: CONSIGNOR_PROFILES[0],
      consignee: CONSIGNEE_PROFILES[0],
      cargo: CARGO_TEMPLATES[0],
      bookingDate: yesterdayStr,
      historySteps: ['BOOKED', 'CANCELLED'],
      cancellationReason: 'Shipper cancelled production batch prior to truck loading.',
    },
  ];

  const lrDefinitions =
    preset === 'ops'
      ? allLrDefinitions.filter((lr) => lr.status === 'BOOKED' || lr.status === 'IN_TRANSIT')
      : allLrDefinitions;

  let podCount = 0;
  let collectionCount = 0;

  for (const def of lrDefinitions) {
    const freightAmountPaise = def.cargo.baseFreightRupees * 100;

    const { data: createdLR, error: lrErr } = await supabase
      .from('lorry_receipts')
      .insert({
        tenant_id: tenantId,
        lr_number: def.lrNumber,
        from_hub_id: def.fromHubId,
        to_hub_id: def.toHubId,
        trip_id: def.tripId,
        status: def.status,
        payment_mode: def.paymentMode,
        freight_amount: freightAmountPaise,
        booking_date: def.bookingDate,
        consignor_name: def.consignor.name,
        consignor_phone: def.consignor.phone,
        consignor_address_line1: def.consignor.address_line1,
        consignor_address_line2: def.consignor.address_line2 ?? null,
        consignor_pin_code: def.consignor.pin_code,
        consignor_gstin: def.consignor.gstin,
        consignee_name: def.consignee.name,
        consignee_phone: def.consignee.phone,
        consignee_address_line1: def.consignee.address_line1,
        consignee_address_line2: def.consignee.address_line2 ?? null,
        consignee_pin_code: def.consignee.pin_code,
        consignee_gstin: def.consignee.gstin,
        goods_description: def.cargo.goods_description,
        num_packages: def.cargo.num_packages,
        weight_kg: def.cargo.weight_kg,
        quantity: def.cargo.quantity,
        created_by: userId,
        source: 'HUB_DIRECT',
      })
      .select('id')
      .single();

    if (lrErr || !createdLR) {
      throw new Error(`Failed to create LR ${def.lrNumber}: ${lrErr?.message}`);
    }

    const lrId = createdLR.id;

    // Seed audit history
    let prevStatus: string | null = null;
    for (const step of def.historySteps) {
      await supabase.from('lr_status_history').insert({
        tenant_id: tenantId,
        lr_id: lrId,
        from_status: prevStatus,
        to_status: step,
        changed_by: userId,
        notes: step === 'CANCELLED' ? (def.cancellationReason ?? 'Cancelled by dispatcher') : `Status changed to ${step}`,
      });
      prevStatus = step;
    }

    // Seed POD if DELIVERED
    if (def.status === 'DELIVERED' && def.podReceiver) {
      await supabase.from('proof_of_deliveries').insert({
        tenant_id: tenantId,
        lr_id: lrId,
        receiver_name: def.podReceiver,
        delivered_at: now.toISOString(),
        notes: 'Signed physical delivery challan acknowledged on arrival.',
      });
      podCount++;

      // Seed To-Pay collection record if TO_PAY
      if (def.paymentMode === 'TO_PAY') {
        await supabase.from('to_pay_collections').insert({
          tenant_id: tenantId,
          lr_id: lrId,
          amount_collected: freightAmountPaise,
          collected: def.isToPayCollected ?? true,
          payment_mode: def.collectionPaymentMode ?? 'CASH',
          collected_by: userId,
          collected_at: now.toISOString(),
          notes: 'Freight collection received at delivery point.',
        });
        collectionCount++;
      }
    }
  }

  logSuccess(
    `Seeded ${lrDefinitions.length} Lorry Receipts across lifecycle (3 Pool BOOKED, 2 Scheduled BOOKED, 2 IN_TRANSIT, 2 ARRIVED, 2 DELIVERED with PODs, 1 CANCELLED).`
  );

  return {
    totalLRs: lrDefinitions.length,
    pods: podCount,
    collections: collectionCount,
  };
}
