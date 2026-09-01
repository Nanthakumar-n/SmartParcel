import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';
import type { ActionResult } from '@/lib/types/action-result';
import { actionSuccess, formError } from '@/lib/types/action-result';
import { getTenantById, getTenantBySlug, updateTenant, type TenantRow } from '@/lib/db/tenants';
import {
  getTenantSettings,
  upsertTenantSettings,
  getRecentNotificationLogs,
  type TenantSettingsRow,
  type NotificationLogRow,
} from '@/lib/db/tenant-settings';
import type {
  CompanyProfileInput,
  LRSettingsInput,
  WhatsAppSettingsInput,
  TestWatiConnectionInput,
} from '@/lib/validations/tenant-settings';
import { normalizePhone } from '@/lib/utils/format-phone';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export interface TenantSettingsSummary {
  tenant: TenantRow;
  settings: TenantSettingsRow | null;
  logs: NotificationLogRow[];
  isTokenConfigured: boolean;
}

export const MASKED_TOKEN_PLACEHOLDER = '••••••••••••••••';

/**
 * Get tenant and settings data for settings dashboard.
 */
export async function getTenantSettingsSummaryService(
  supabase: AnySupabaseClient,
  tenantId: string
): Promise<TenantSettingsSummary | null> {
  const [tenant, settings, logs] = await Promise.all([
    getTenantById(supabase, tenantId),
    getTenantSettings(supabase, tenantId),
    getRecentNotificationLogs(supabase, tenantId, 10),
  ]);

  if (!tenant) {
    return null;
  }

  const isTokenConfigured = Boolean(settings?.wati_api_token && settings.wati_api_token.length > 0);

  // Return settings with masked token
  const safeSettings: TenantSettingsRow | null = settings
    ? {
        ...settings,
        wati_api_token: isTokenConfigured ? MASKED_TOKEN_PLACEHOLDER : '',
      }
    : null;

  return {
    tenant,
    settings: safeSettings,
    logs,
    isTokenConfigured,
  };
}

/**
 * Update company profile (tenant details).
 */
export async function updateCompanyProfileService(
  supabase: AnySupabaseClient,
  tenantId: string,
  input: CompanyProfileInput
): Promise<ActionResult<{ tenant: TenantRow }>> {
  try {
    const normalizedPhone = normalizePhone(input.contact_phone);
    const normalizedGSTIN = input.gstin && input.gstin.trim() !== '' ? input.gstin.trim().toUpperCase() : null;
    const normalizedSlug = input.slug.trim().toLowerCase();

    // Check for slug collision with other tenants
    const existingWithSlug = await getTenantBySlug(supabase, normalizedSlug);
    if (existingWithSlug && existingWithSlug.id !== tenantId) {
      return formError(`The portal URL slug "${normalizedSlug}" is already taken by another company. Please choose a different slug.`);
    }

    const updated = await updateTenant(supabase, tenantId, {
      name: input.name.trim(),
      slug: normalizedSlug,
      gstin: normalizedGSTIN,
      contact_phone: normalizedPhone,
      address_line1: input.address_line1.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      pin_code: input.pin_code.trim(),
    });

    if (!updated) {
      return formError('Failed to update company profile. Tenant not found.');
    }

    return actionSuccess({ tenant: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error updating company profile';
    return formError(message);
  }
}

/**
 * Update LR & Waybill defaults in tenant settings.
 */
export async function updateLRSettingsService(
  supabase: AnySupabaseClient,
  tenantId: string,
  input: LRSettingsInput
): Promise<ActionResult<{ settings: TenantSettingsRow }>> {
  try {
    const updated = await upsertTenantSettings(supabase, tenantId, {
      lr_terms_and_conditions: input.lr_terms_and_conditions?.trim() || null,
      lr_default_remarks: input.lr_default_remarks?.trim() || null,
      waybill_format: input.waybill_format,
      waybill_copies: input.waybill_copies,
      show_gst_breakdown: input.show_gst_breakdown,
      show_tracking_qr: input.show_tracking_qr,
      show_terms_on_print: input.show_terms_on_print,
    });

    if (!updated) {
      return formError('Failed to update waybill settings.');
    }

    return actionSuccess({ settings: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error updating waybill settings';
    return formError(message);
  }
}

/**
 * Update WhatsApp / WATI configuration in tenant settings.
 */
export async function updateWhatsAppSettingsService(
  supabase: AnySupabaseClient,
  tenantId: string,
  input: WhatsAppSettingsInput
): Promise<ActionResult<{ settings: TenantSettingsRow }>> {
  try {
    // If masked token or empty token is submitted, retain existing token in DB
    let tokenToSave: string | null | undefined = input.wati_api_token?.trim();
    if (!tokenToSave || tokenToSave === MASKED_TOKEN_PLACEHOLDER) {
      const existing = await getTenantSettings(supabase, tenantId);
      tokenToSave = existing?.wati_api_token ?? null;
    }

    const updated = await upsertTenantSettings(supabase, tenantId, {
      whatsapp_enabled: input.whatsapp_enabled,
      wati_api_endpoint: input.wati_api_endpoint?.trim() || null,
      wati_api_token: tokenToSave,
      notification_preferences: input.notification_preferences,
      payment_reminder_days: input.payment_reminder_days,
    });

    if (!updated) {
      return formError('Failed to update WhatsApp settings.');
    }

    return actionSuccess({
      settings: {
        ...updated,
        wati_api_token: updated.wati_api_token ? MASKED_TOKEN_PLACEHOLDER : '',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error updating WhatsApp settings';
    return formError(message);
  }
}

/**
 * Test WATI endpoint connection and token validity.
 */
export async function testWatiConnectionService(
  supabase: AnySupabaseClient,
  tenantId: string,
  input: TestWatiConnectionInput
): Promise<ActionResult<{ success: boolean; message: string }>> {
  let token = input.wati_api_token.trim();

  // If masked token provided, lookup actual token from DB
  if (token === MASKED_TOKEN_PLACEHOLDER) {
    const existing = await getTenantSettings(supabase, tenantId);
    if (!existing?.wati_api_token) {
      return formError('No existing WATI API token found on file. Please enter a valid token.');
    }
    token = existing.wati_api_token;
  }

  const endpoint = input.wati_api_endpoint.replace(/\/+$/, '');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const testUrl = `${endpoint}/api/v1/getTemplates`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 200) {
      return actionSuccess({
        success: true,
        message: 'WATI connection successful! Meta message templates synchronized.',
      });
    }

    if (response.status === 401 || response.status === 403) {
      return formError('WATI Authentication failed (401/403). Please verify your API token.');
    }

    return formError(`WATI API returned status ${response.status}: ${response.statusText}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return formError('Connection timed out while reaching WATI API endpoint.');
    }
    const message = err instanceof Error ? err.message : 'Network error reaching WATI endpoint';
    return formError(`Failed to reach WATI endpoint: ${message}`);
  }
}
