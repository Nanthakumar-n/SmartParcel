import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

export type TenantSettingsRow = Database['public']['Tables']['tenant_settings']['Row'];
export type TenantSettingsInsert = Database['public']['Tables']['tenant_settings']['Insert'];
export type TenantSettingsUpdate = Database['public']['Tables']['tenant_settings']['Update'];

export type NotificationLogRow = Database['public']['Tables']['whatsapp_notifications_log']['Row'];
export type NotificationLogInsert = Database['public']['Tables']['whatsapp_notifications_log']['Insert'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Get tenant settings by tenant ID.
 */
export async function getTenantSettings(
  supabase: AnySupabaseClient,
  tenantId: string
): Promise<TenantSettingsRow | null> {
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('*')
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
    .select()
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
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }
  return data;
}
