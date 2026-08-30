import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/types/supabase';
import { logSuccess } from '../utils/logger';
import type { SeededTrip } from './trips';

export interface ExpenseSeedStats {
  totalExpenses: number;
  totalSettlements: number;
}

export async function seedTripExpenses(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  tripMap: Map<string, SeededTrip>,
  userId: string
): Promise<ExpenseSeedStats> {
  const intransitTrip = tripMap.get('intransit_mum_blr');
  const completedSettledTrip = tripMap.get('completed_del_mum_settled');
  const completedUnsettledTrip = tripMap.get('completed_blr_mum_unsettled');

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 72 * 3600 * 1000).toISOString();

  let totalExpenses = 0;
  let totalSettlements = 0;

  // 1. In-Transit Trip Expenses (MUM -> BLR) — Unsettled
  if (intransitTrip) {
    const expenses = [
      {
        tenant_id: tenantId,
        trip_id: intransitTrip.id,
        driver_id: intransitTrip.driverId,
        category: 'ADVANCE',
        amount: 1500000, // +₹15,000
        description: 'Trip fuel and highway transit cash advance given to driver at Mumbai hub',
        entered_by: userId,
        entered_at: twoDaysAgo,
        is_voided: false,
      },
      {
        tenant_id: tenantId,
        trip_id: intransitTrip.id,
        driver_id: intransitTrip.driverId,
        category: 'FUEL',
        amount: -850000, // -₹8,500
        description: 'HPCL COCO Pump Pune-Satara Highway Diesel (100L)',
        entered_by: userId,
        entered_at: yesterday,
        is_voided: false,
      },
      {
        tenant_id: tenantId,
        trip_id: intransitTrip.id,
        driver_id: intransitTrip.driverId,
        category: 'TOLL',
        amount: -240000, // -₹2,400
        description: 'Khed Shivapur & Anewadi Plaza cash toll passes',
        entered_by: userId,
        entered_at: yesterday,
        is_voided: false,
      },
      {
        tenant_id: tenantId,
        trip_id: intransitTrip.id,
        driver_id: intransitTrip.driverId,
        category: 'BHATTA',
        amount: -150000, // -₹1,500
        description: 'Driver overnight food allowance (2 days)',
        entered_by: userId,
        entered_at: yesterday,
        is_voided: false,
      },
    ];

    const { error } = await supabase.from('trip_expenses').insert(expenses);
    if (error) throw new Error(`Failed to seed in-transit trip expenses: ${error.message}`);
    totalExpenses += expenses.length;
  }

  // 2. Completed Settled Trip Expenses (DEL -> MUM)
  if (completedSettledTrip) {
    // Insert settlement first
    const { data: settlement, error: sErr } = await supabase
      .from('trip_expense_settlements')
      .insert({
        tenant_id: tenantId,
        trip_id: completedSettledTrip.id,
        net_balance: 0,
        settlement_mode: 'UPI',
        settled_by: userId,
        settled_at: yesterday,
        notes: 'Trip expenses fully balanced and settled with driver Suresh Singh via PhonePe UPI.',
      })
      .select('id')
      .single();

    if (sErr || !settlement) {
      throw new Error(`Failed to create settlement: ${sErr?.message}`);
    }
    totalSettlements++;

    const expenses = [
      {
        tenant_id: tenantId,
        trip_id: completedSettledTrip.id,
        driver_id: completedSettledTrip.driverId,
        category: 'ADVANCE',
        amount: 2000000, // +₹20,000
        description: 'Delhi origin hub dispatch advance',
        entered_by: userId,
        entered_at: threeDaysAgo,
        is_voided: false,
        settlement_id: settlement.id,
      },
      {
        tenant_id: tenantId,
        trip_id: completedSettledTrip.id,
        driver_id: completedSettledTrip.driverId,
        category: 'FUEL',
        amount: -1420000, // -₹14,200
        description: 'IOCL Jaipur-Udaipur Highway Diesel (165L)',
        entered_by: userId,
        entered_at: twoDaysAgo,
        is_voided: false,
        settlement_id: settlement.id,
      },
      {
        tenant_id: tenantId,
        trip_id: completedSettledTrip.id,
        driver_id: completedSettledTrip.driverId,
        category: 'TOLL',
        amount: -380000, // -₹3,800
        description: 'Rajasthan & Gujarat border FastTag plazas',
        entered_by: userId,
        entered_at: twoDaysAgo,
        is_voided: false,
        settlement_id: settlement.id,
      },
      {
        tenant_id: tenantId,
        trip_id: completedSettledTrip.id,
        driver_id: completedSettledTrip.driverId,
        category: 'BHATTA',
        amount: -200000, // -₹2,000
        description: 'Driver standard bhatta',
        entered_by: userId,
        entered_at: yesterday,
        is_voided: false,
        settlement_id: settlement.id,
      },
    ];

    const { error } = await supabase.from('trip_expenses').insert(expenses);
    if (error) throw new Error(`Failed to seed settled trip expenses: ${error.message}`);
    totalExpenses += expenses.length;
  }

  // 3. Completed Unsettled Trip Expenses (BLR -> MUM) — Ready for Fleet Owner settlement
  if (completedUnsettledTrip) {
    const expenses = [
      {
        tenant_id: tenantId,
        trip_id: completedUnsettledTrip.id,
        driver_id: completedUnsettledTrip.driverId,
        category: 'ADVANCE',
        amount: 1200000, // +₹12,000
        description: 'Bangalore origin dispatch advance',
        entered_by: userId,
        entered_at: twoDaysAgo,
        is_voided: false,
      },
      {
        tenant_id: tenantId,
        trip_id: completedUnsettledTrip.id,
        driver_id: completedUnsettledTrip.driverId,
        category: 'FUEL',
        amount: -980000, // -₹9,800
        description: 'BPCL Hubli Bypass Diesel',
        entered_by: userId,
        entered_at: yesterday,
        is_voided: false,
      },
      {
        tenant_id: tenantId,
        trip_id: completedUnsettledTrip.id,
        driver_id: completedUnsettledTrip.driverId,
        category: 'LABOUR',
        amount: -120000, // -₹1,200
        description: 'Unloading helper labour paid at intermediate drop',
        entered_by: userId,
        entered_at: yesterday,
        is_voided: false,
      },
      {
        tenant_id: tenantId,
        trip_id: completedUnsettledTrip.id,
        driver_id: completedUnsettledTrip.driverId,
        category: 'MAINTENANCE',
        amount: -80000, // -₹800
        description: 'Rear right tyre puncture vulcanizing repair',
        entered_by: userId,
        entered_at: yesterday,
        is_voided: false,
      },
    ];

    const { error } = await supabase.from('trip_expenses').insert(expenses);
    if (error) throw new Error(`Failed to seed completed unsettled trip expenses: ${error.message}`);
    totalExpenses += expenses.length;
  }

  logSuccess(
    `Seeded ${totalExpenses} Trip Expense records across categories (ADVANCE, FUEL, TOLL, BHATTA, LABOUR, MAINTENANCE) and ${totalSettlements} settled ledger.`
  );

  return {
    totalExpenses,
    totalSettlements,
  };
}
