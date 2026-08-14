/**
 * Regex for validating Indian mobile phone numbers.
 * Accepts with or without +91 prefix. Must start with 6-9.
 */
export const INDIA_PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;

/**
 * Validate an Indian mobile phone number.
 *
 * @param phone - Phone number (with or without +91, with or without spaces)
 * @returns true if valid
 */
export function validateIndianPhone(phone: string): boolean {
  return INDIA_PHONE_REGEX.test(phone.replace(/\s+/g, ''));
}

/**
 * Normalize a phone number to E.164 format (+919876543210).
 * Strips spaces and adds +91 prefix if not present.
 *
 * @param phone - Raw phone input
 * @returns E.164 formatted phone string
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/^0+/, '');
  if (cleaned.startsWith('+91')) {
    return cleaned;
  }
  return `+91${cleaned}`;
}

/**
 * Format a phone number for display: +91 98765 43210
 *
 * @param phone - E.164 formatted phone (+919876543210)
 * @returns Display formatted string
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '');
  // Extract the 10-digit number
  const digits = cleaned.startsWith('+91')
    ? cleaned.slice(3)
    : cleaned.startsWith('91') && cleaned.length === 12
      ? cleaned.slice(2)
      : cleaned;

  if (digits.length !== 10) return phone; // Return as-is if unexpected format

  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}
