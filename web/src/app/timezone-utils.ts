/**
 * Utility functions for timezone handling
 */

/**
 * Get a timezone label (abbreviation or GMT offset) for display
 * Uses the browser's local timezone, not the event timezone
 * @param date Reference date to determine the timezone abbreviation (for DST)
 * @returns Timezone abbreviation (e.g., 'MDT', 'MST') or GMT offset (e.g., 'GMT-6')
 */
export function getLocalTimeZoneLabel(date: Date): string {
  try {
    // Get the local timezone abbreviation using Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find((part) => part.type === 'timeZoneName');

    if (timeZonePart && timeZonePart.value) {
      return timeZonePart.value;
    }

    // Fallback to GMT offset if abbreviation not available
    return getLocalGMTOffset(date);
  } catch (error) {
    // If timezone is invalid, return GMT offset
    return getLocalGMTOffset(date);
  }
}

/**
 * Get GMT offset for local timezone
 * @param date Reference date
 * @returns GMT offset string (e.g., 'GMT-6', 'GMT+5:30')
 */
function getLocalGMTOffset(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find((part) => part.type === 'timeZoneName');

    if (timeZonePart && timeZonePart.value) {
      return timeZonePart.value;
    }

    // Ultimate fallback
    return 'Local';
  } catch (error) {
    return 'Local';
  }
}
