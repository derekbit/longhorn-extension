const GiB = 1024 * 1024 * 1024;

/**
 * Formats bytes into GiB, applying minimum display threshold (0.01 GiB)
 * for small, non-zero values for better UX.
 * @param bytes - The raw number of bytes.
 * @returns The formatted GiB value as a number.
 */
export function bytesToGi(bytes: number | string): number {
  const value = Number(bytes) / GiB;

  if (value === 0) {
    return 0;
  }

  if (value < 1) {
    const formattedValue = parseFloat(value.toFixed(3));

    if (formattedValue > 0 && formattedValue < 0.01) {
      return 0.01;
    }

    return formattedValue;
  }

  return parseFloat(value.toFixed(2));
}
