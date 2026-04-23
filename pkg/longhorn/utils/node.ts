export function asNumber(value: unknown): number {
  return Number(value || 0);
}

export function countMapEntries(map: Record<string, unknown> | null | undefined): number {
  return Object.keys(map || {}).length;
}

export function sumMapValues(map: Record<string, unknown> | null | undefined): number {
  return Object.values(map || {}).reduce<number>((acc, value) => acc + asNumber(value), 0);
}

export function displayOrDash(value: unknown): string {
  if (value === null || value === undefined) {
    return '\u2014';
  }

  const text = String(value).trim();

  return text === '' ? '\u2014' : text;
}
