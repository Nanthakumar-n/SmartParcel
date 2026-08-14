/**
 * Format a Date to IST display string.
 *
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options override
 * @returns Formatted date string in IST (e.g., "13 Aug 2025, 2:30 PM")
 */
export function formatDateIST(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  }).format(d);
}

/**
 * Format a Date to IST date-only string (no time).
 *
 * @param date - Date to format
 * @returns Formatted date string (e.g., "13 Aug 2025")
 */
export function formatDateOnlyIST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}
