import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/types/supabase';
import { logInfo, logSuccess, logWarn } from './utils/logger';

/**
 * Purges tenant transactional data in foreign key dependency order
 */
export async function purgeTransactionalData(supabase: SupabaseClient<Database>, tenantId: string) {
  logInfo(`Purging existing transactional records for tenant: ${tenantId}...`);

  // 1. Unlink trip_expenses settlements reference
  await supabase
    .from('trip_expenses')
    .update({ settlement_id: null })
    .eq('tenant_id', tenantId);

  // 2. Delete trip_expense_settlements
  const { error: setErr } = await supabase
    .from('trip_expense_settlements')
    .delete()
    .eq('tenant_id', tenantId);
  if (setErr) logWarn(`trip_expense_settlements purge warning: ${setErr.message}`);

  // 3. Delete trip_expenses
  const { error: expErr } = await supabase
    .from('trip_expenses')
    .delete()
    .eq('tenant_id', tenantId);
  if (expErr) logWarn(`trip_expenses purge warning: ${expErr.message}`);

  // 4. Delete to_pay_collections
  const { error: collErr } = await supabase
    .from('to_pay_collections')
    .delete()
    .eq('tenant_id', tenantId);
  if (collErr) logWarn(`to_pay_collections purge warning: ${collErr.message}`);

  // 5. Delete proof_of_deliveries
  const { error: podErr } = await supabase
    .from('proof_of_deliveries')
    .delete()
    .eq('tenant_id', tenantId);
  if (podErr) logWarn(`proof_of_deliveries purge warning: ${podErr.message}`);

  // 6. Delete lr_status_history
  const { error: histErr } = await supabase
    .from('lr_status_history')
    .delete()
    .eq('tenant_id', tenantId);
  if (histErr) logWarn(`lr_status_history purge warning: ${histErr.message}`);

  // 7. Unlink booking_requests lr_id
  await supabase
    .from('booking_requests')
    .update({ lr_id: null })
    .eq('tenant_id', tenantId);

  // 8. Delete lorry_receipts
  const { error: lrErr } = await supabase
    .from('lorry_receipts')
    .delete()
    .eq('tenant_id', tenantId);
  if (lrErr) logWarn(`lorry_receipts purge warning: ${lrErr.message}`);

  // 9. Delete booking_requests
  const { error: brErr } = await supabase
    .from('booking_requests')
    .delete()
    .eq('tenant_id', tenantId);
  if (brErr) logWarn(`booking_requests purge warning: ${brErr.message}`);

  // 10. Delete trips
  const { error: tripErr } = await supabase
    .from('trips')
    .delete()
    .eq('tenant_id', tenantId);
  if (tripErr) logWarn(`trips purge warning: ${tripErr.message}`);

  logSuccess('Cleaned previous transactional records (Trips, LRs, Bookings, Expenses, Settlements, PODs).');
}
