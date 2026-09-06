/**
 * Reduces a dataset to its distinct string values, newest-first, for
 * populating a SearchCombobox's suggestion dropdown (e.g. "the 5 most
 * recently created batch numbers"). When a value repeats, the most recent
 * occurrence's date wins. Falsy values (missing name/date) are skipped.
 */
export function latestDistinctValues<T>(
  items: T[],
  getValue: (item: T) => string | undefined | null,
  getDate: (item: T) => string | number | Date | undefined | null
): string[] {
  const latestTimeByValue = new Map<string, number>();
  for (const item of items) {
    const value = getValue(item)?.trim();
    if (!value) continue;
    const dateValue = getDate(item);
    const time = dateValue ? new Date(dateValue).getTime() : 0;
    const existing = latestTimeByValue.get(value);
    if (existing === undefined || time > existing) latestTimeByValue.set(value, time);
  }
  return Array.from(latestTimeByValue.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value]) => value);
}
