/**
 * Regex for validating Indian vehicle registration numbers.
 * Format: XX 00 XX 0000 (e.g., MH 12 AB 1234)
 */
export const VEHICLE_NUMBER_REGEX = /^[A-Z]{2}\s\d{2}\s[A-Z]{1,2}\s\d{4}$/;

/**
 * Validate an Indian vehicle registration number.
 *
 * @param number - Vehicle number (e.g., "MH 12 AB 1234")
 * @returns true if valid
 */
export function validateVehicleNumber(number: string): boolean {
  return VEHICLE_NUMBER_REGEX.test(number.toUpperCase().trim());
}

/**
 * Format a vehicle number to the standard uppercase display format.
 * Normalizes spaces and converts to uppercase.
 *
 * @param number - Raw vehicle number input
 * @returns Formatted vehicle number (e.g., "MH 12 AB 1234")
 */
export function formatVehicleNumber(number: string): string {
  return number.toUpperCase().trim().replace(/\s+/g, ' ');
}
