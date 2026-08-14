/**
 * Standardized return type for all Server Actions.
 *
 * Success branch carries typed data.
 * Error branch uses field names as keys. `_form` for form-level (non-field) errors.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: Record<string, string[]> };

/**
 * Create a successful ActionResult.
 */
export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

/**
 * Create a successful ActionResult with no data (void).
 */
export function actionSuccessVoid(): ActionResult<void> {
  return { success: true, data: undefined };
}

/**
 * Create a field-level error ActionResult.
 */
export function actionError(
  field: string,
  ...messages: string[]
): ActionResult<never> {
  return { success: false, error: { [field]: messages } };
}

/**
 * Create a form-level error ActionResult (non-field-specific).
 */
export function formError(...messages: string[]): ActionResult<never> {
  return { success: false, error: { _form: messages } };
}

/**
 * Convert Zod flatten field errors to ActionResult error format.
 */
export function zodFieldErrors(
  fieldErrors: Record<string, string[] | undefined>
): ActionResult<never> {
  const errors: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (value && value.length > 0) {
      errors[key] = value;
    }
  }
  return { success: false, error: errors };
}
