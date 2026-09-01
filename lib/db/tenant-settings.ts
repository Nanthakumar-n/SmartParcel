import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

export type TenantSettingsRow = Database['public']['Tables']['tenant_settings']['Row'];
export type TenantSettingsInsert = Database['public']['Tables']['tenant_settings']['Insert'];
export type TenantSettingsUpdate = Database['public']['Tables']['tenant_settings']['Update'];

export type NotificationLogRow = Database['public']['Tables']['whatsapp_notifications_log']['Row'];
export type NotificationLogInsert = Database['public']['Tables']['whatsapp_notifications_log']['Insert'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

const TENANT_SETTINGS_COLUMNS = `
  id,
  tenant_id,
  lr_terms_and_conditions,
  lr_default_remarks,
  whatsapp_enabled,
  wati_api_endpoint,
  wati_api_token,
  notification_preferences,
  payment_reminder_days,
  waybill_format,
  waybill_copies,
  show_gst_breakdown,
  show_tracking_qr,
  show_terms_on_print,
  created_at,
  updated_at
`;

const NOTIFICATION_LOG_COLUMNS = `
  id,
  tenant_id,
  lr_id,
  event_type,
  recipient_phone,
  wati_message_id,
  status,
  reminder_sequence,
  error_message,
  sent_at
`;

/**
 * Get tenant settings by tenant ID.
 */
export async function getTenantSettings(
  supabase: AnySupabaseClient,
  tenantId: string
): Promise<TenantSettingsRow | null> {
  const { data, error } = await supabase
    .from('tenant_settings')
    .select(TENANT_SETTINGS_COLUMNS)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    return null;
  }
  return data;
}

/**
 * Upsert tenant settings.
 */
export async function upsertTenantSettings(
  supabase: AnySupabaseClient,
  tenantId: string,
  settings: Partial<TenantSettingsInsert>
): Promise<TenantSettingsRow | null> {
  const payload: TenantSettingsInsert = {
    tenant_id: tenantId,
    ...settings,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('tenant_settings')
    .upsert(payload, { onConflict: 'tenant_id' })
    .select(TENANT_SETTINGS_COLUMNS)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Get recent notification logs for the tenant.
 */
export async function getRecentNotificationLogs(
  supabase: AnySupabaseClient,
  tenantId: string,
  limit = 10
): Promise<NotificationLogRow[]> {
  const { data, error } = await supabase
    .from('whatsapp_notifications_log')
    .select(NOTIFICATION_LOG_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }
  return data;
}
