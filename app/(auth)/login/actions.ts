'use server';

import { createServerClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations/auth';
import { loginService } from '@/lib/services/auth';
import type { ActionResult } from '@/lib/types/action-result';
import { zodFieldErrors, formError } from '@/lib/types/action-result';
import { revalidatePath } from 'next/cache';

export async function loginAction(
  formData: FormData
): Promise<ActionResult<{ userId: string; role: string; tenantId: string }>> {
  try {
    const rawData = Object.fromEntries(formData.entries());
    const parsed = loginSchema.safeParse(rawData);

    if (!parsed.success) {
      return zodFieldErrors(parsed.error.flatten().fieldErrors);
    }

    const supabase = createServerClient();
    const result = await loginService(supabase, parsed.data);

    if (result.success) {
      revalidatePath('/', 'layout');
    }

    return result;
  } catch {
    return formError('An unexpected server error occurred during login. Please try again.');
  }
}
