/**
 * Format an amount stored in paise to Indian Rupee display string.
 *
 * @param paise - Amount in paise (1 INR = 100 paise)
 * @returns Formatted string like "₹1,00,000.00"
 */
export function paiseToCurrency(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Convert a rupee amount to paise for storage.
 *
 * @param rupees - Amount in rupees (e.g., 1500.50)
 * @returns Amount in paise (e.g., 150050)
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Format an amount in paise as a compact rupee string (no decimal for whole amounts).
 *
 * @param paise - Amount in paise
 * @returns Formatted string like "₹1,50,000" or "₹1,50,000.50"
 */
export function paiseToCurrencyCompact(paise: number): string {
  const rupees = paise / 100;
  const hasFraction = rupees % 1 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees);
}
