// ===========================================================
// lib/types/action-result.ts
// Standardized return type for ALL Server Actions in SmartParcel
// ===========================================================

/**
 * Every Server Action must return ActionResult<T>.
 *
 * - Success branch carries typed data via `data: T`.
 * - Error branch uses field names as keys for field-level errors.
 * - Use `_form` key for form-level (non-field) errors.
 *
 * Examples:
 *   ActionResult<{ id: string }>   — create actions (returns new entity ID)
 *   ActionResult<void>             — update/delete actions (no return data)
 *   ActionResult<LorryReceipt>     — fetch-and-mutate actions
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: Record<string, string[]> };

// --------------- Helper Functions ---------------

/**
 * Create a field-level error result.
 *
 * @example
 *   return actionError('consignor_phone', 'Enter a valid Indian mobile number');
 */
export function actionError(
  field: string,
  message: string
): ActionResult<never> {
  return { success: false, error: { [field]: [message] } };
}

/**
 * Create a form-level error result (not tied to a specific field).
 *
 * @example
 *   return formError('An unexpected error occurred. Please try again.');
 */
export function formError(message: string): ActionResult<never> {
  return { success: false, error: { _form: [message] } };
}

/**
 * Create a success result with typed data.
 *
 * @example
 *   return actionSuccess({ id: newLR.id });
 */
export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

// --------------- Client-Side Usage ---------------

/**
 * Example: Using ActionResult in a Client Component with sonner toast
 *
 * ```typescript
 * 'use client';
 * import { toast } from 'sonner';
 * import { createLorryReceipt } from './actions';
 *
 * async function onSubmit(data: LRCreateInput) {
 *   const result = await createLorryReceipt(data);
 *
 *   if (result.success) {
 *     toast.success('LR created successfully');
 *     router.push(`/lorry-receipts/${result.data.id}`);
 *     return;
 *   }
 *
 *   // Show field-level errors
 *   Object.entries(result.error).forEach(([field, messages]) => {
 *     if (field === '_form') {
 *       toast.error(messages[0]);
 *     } else {
 *       form.setError(field as keyof LRCreateInput, {
 *         message: messages[0],
 *       });
 *     }
 *   });
 * }
 * ```
 */
