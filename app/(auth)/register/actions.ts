'use server';

import { createServerClient } from '@/lib/supabase/server';
import { tenantRegisterSchema } from '@/lib/validations/auth';
import { registerFleetOwnerService } from '@/lib/services/auth';
import type { ActionResult } from '@/lib/types/action-result';
import { zodFieldErrors, formError } from '@/lib/types/action-result';
import { revalidatePath } from 'next/cache';

export async function registerTenantAction(
  formData: FormData
): Promise<ActionResult<{ tenantSlug: string; userId: string }>> {
  try {
    const rawData = Object.fromEntries(formData.entries());
    const parsed = tenantRegisterSchema.safeParse(rawData);

    if (!parsed.success) {
      return zodFieldErrors(parsed.error.flatten().fieldErrors);
    }

    const supabase = createServerClient();
    const result = await registerFleetOwnerService(supabase, parsed.data);

    if (result.success) {
      revalidatePath('/', 'layout');
    }

    return result;
  } catch {
    return formError('An unexpected server error occurred during registration. Please try again.');
  }
}
