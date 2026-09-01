'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { createServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import {
  formError,
  zodFieldErrors,
  type ActionResult,
} from '@/lib/types/action-result';
import {
  companyProfileSchema,
  lrSettingsSchema,
  whatsappSettingsSchema,
  testWatiConnectionSchema,
  type CompanyProfileInput,
  type LRSettingsInput,
  type WhatsAppSettingsInput,
  type TestWatiConnectionInput,
} from '@/lib/validations/tenant-settings';
import {
  updateCompanyProfileService,
  updateLRSettingsService,
  updateWhatsAppSettingsService,
  testWatiConnectionService,
} from '@/lib/services/tenant-settings';
import type { TenantRow } from '@/lib/db/tenants';
import type { TenantSettingsRow } from '@/lib/db/tenant-settings';

/**
 * Server Action: Update company profile
 */
export async function updateCompanyProfileAction(
  input: CompanyProfileInput
): Promise<ActionResult<{ tenant: TenantRow }>> {
  try {
    const session = await requireRole(['fleet_owner']);
    if (!session || !session.tenantId) {
      return formError('Unauthorized. Only Fleet Owners can manage company settings.');
    }

    const parsed = companyProfileSchema.safeParse(input);
    if (!parsed.success) {
      return zodFieldErrors(parsed.error.flatten().fieldErrors);
    }

    const supabase = createServerClient();
    const result = await updateCompanyProfileService(supabase, session.tenantId, parsed.data);

    if (result.success) {
      revalidatePath('/settings');
      revalidatePath('/dashboard');
    }

    return result;
  } catch (err) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return formError(message);
  }
}

/**
 * Server Action: Update LR & Waybill defaults
 */
export async function updateLRSettingsAction(
  input: LRSettingsInput
): Promise<ActionResult<{ settings: TenantSettingsRow }>> {
  try {
    const session = await requireRole(['fleet_owner']);
    if (!session || !session.tenantId) {
      return formError('Unauthorized. Only Fleet Owners can manage LR defaults.');
    }

    const parsed = lrSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return zodFieldErrors(parsed.error.flatten().fieldErrors);
    }

    const supabase = createServerClient();
    const result = await updateLRSettingsService(supabase, session.tenantId, parsed.data);

    if (result.success) {
      revalidatePath('/settings');
      revalidatePath('/lorry-receipts');
      revalidatePath('/lorry-receipts/new');
    }

    return result;
  } catch (err) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return formError(message);
  }
}

/**
 * Server Action: Update WhatsApp / WATI Configuration
 */
export async function updateWhatsAppSettingsAction(
  input: WhatsAppSettingsInput
): Promise<ActionResult<{ settings: TenantSettingsRow }>> {
  try {
    const session = await requireRole(['fleet_owner']);
    if (!session || !session.tenantId) {
      return formError('Unauthorized. Only Fleet Owners can manage WhatsApp settings.');
    }

    const parsed = whatsappSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return zodFieldErrors(parsed.error.flatten().fieldErrors);
    }

    const supabase = createServerClient();
    const result = await updateWhatsAppSettingsService(supabase, session.tenantId, parsed.data);

    if (result.success) {
      revalidatePath('/settings');
    }

    return result;
  } catch (err) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return formError(message);
  }
}

/**
 * Server Action: Test WATI API Connection
 */
export async function testWatiConnectionAction(
  input: TestWatiConnectionInput
): Promise<ActionResult<{ success: boolean; message: string }>> {
  try {
    const session = await requireRole(['fleet_owner']);
    if (!session || !session.tenantId) {
      return formError('Unauthorized. Only Fleet Owners can test integrations.');
    }

    const parsed = testWatiConnectionSchema.safeParse(input);
    if (!parsed.success) {
      return zodFieldErrors(parsed.error.flatten().fieldErrors);
    }

    const supabase = createServerClient();
    return await testWatiConnectionService(supabase, session.tenantId, parsed.data);
  } catch (err) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred testing WATI';
    return formError(message);
  }
}
