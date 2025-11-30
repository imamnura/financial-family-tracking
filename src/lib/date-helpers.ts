/**
 * Helper functions for date manipulation with Budget month/year format
 */

/**
 * Convert year and month to YYYYMM integer format
 */
export function toMonthInt(year: number, month: number): number {
  return year * 100 + month;
}

/**
 * Convert YYYYMM integer to Date (first day of month)
 */
export function monthIntToDate(monthInt: number): Date {
  const year = Math.floor(monthInt / 100);
  const month = monthInt % 100;
  return new Date(year, month - 1, 1);
}

/**
 * Get month integer from Date
 */
export function getMonthInt(date: Date): number {
  return date.getFullYear() * 100 + (date.getMonth() + 1);
}

/**
 * Get start and end dates for a given month integer
 */
export function getMonthDateRange(monthInt: number): {
  start: Date;
  end: Date;
} {
  const year = Math.floor(monthInt / 100);
  const month = monthInt % 100;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return { start, end };
}

/**
 * Get array of month integers between two dates
 */
export function getMonthIntRange(startDate: Date, endDate: Date): number[] {
  const months: number[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (current <= end) {
    months.push(getMonthInt(current));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}
