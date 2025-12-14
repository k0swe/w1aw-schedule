/**
 * Shared utility for generating stable, deterministic shift IDs.
 * Uses UUID v5 to create collision-resistant IDs from shift parameters.
 */

import uuidByString from 'uuid-by-string';

// Namespace UUID for W1AW Schedule shifts (randomly generated, fixed)
const SHIFT_NAMESPACE = 'f7a3e5c1-9b2d-4a6f-8e3c-1d5b7a9c4f2e';

/**
 * Generate a deterministic shift ID from shift parameters.
 * Uses UUID v5 with milliseconds since Unix epoch to avoid timestamp implementation differences.
 *
 * @param timeMillis - Milliseconds since Unix epoch (from Timestamp.toMillis())
 * @param band - Band identifier (e.g., '20', '40', '80')
 * @param mode - Mode identifier (e.g., 'phone', 'cw', 'digital')
 * @returns A deterministic UUID v5 string
 */
export const shiftId = (timeMillis: number, band: string, mode: string): string => {
  const input = `${timeMillis}-${band}-${mode}`;
  return uuidByString(input, SHIFT_NAMESPACE);
};
