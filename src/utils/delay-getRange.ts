/**
 * delay-getRange.ts
 * Returns delay range in milliseconds based on profile name or dynamic string input
 */

type DelayProfile = 'instant' | 'short' | 'medium' | 'long' | 'reading';

interface DelayRange {
  min: number;
  max: number;
}

/**
 * Parses a delay string (e.g., "100", "1s", "0.5", "0.2s") into milliseconds.
 * All numeric inputs are interpreted as SECONDS and then converted to milliseconds.
 * The 's' suffix is optional for clarity.
 * @param delayStr - The delay string to parse.
 * @returns The parsed delay in milliseconds.
 */
function parseDelayValue(delayStr: string): number {
  const valueStr = delayStr.endsWith('s') ? delayStr.slice(0, -1) : delayStr;
  const value = parseFloat(valueStr);

  if (isNaN(value)) {
    return 0; // Invalid value, default to 0ms
  }

  // Interpret all numeric inputs as seconds, then convert to milliseconds
  return value * 1000;
}

/**
 * Returns delay range in milliseconds based on profile name or dynamic string input.
 * Dynamic string formats (all interpreted as seconds, then converted to milliseconds):
 * - Single value: "1" (1000ms), "0.5" (500ms), "100" (100000ms)
 * - Single value with 's': "1s" (1000ms), "0.5s" (500ms), "100s" (100000ms)
 * - Range: "1-2" (1000-2000ms), "0.5-1.5s" (500-1500ms)
 * @param {DelayProfile | string} profile - Delay profile name or dynamic delay string.
 * @returns {DelayRange} Delay range object.
 */
export function getDelayRange(profile: DelayProfile | string = 'medium'): DelayRange {
  const ranges: Record<DelayProfile, DelayRange> = {
    instant: { min: 0, max: 50 },
    short: { min: 100, max: 500 },
    medium: { min: 500, max: 1500 },
    long: { min: 1500, max: 3000 },
    reading: { min: 120000, max: 180000 }, // 2-3 minutes for reading simulation
  };

  // If it's a predefined profile, return it
  if (profile in ranges) {
    return ranges[profile as DelayProfile];
  }

  // Attempt to parse as dynamic string
  if (typeof profile === 'string') {
    const parts = profile.split('-');
    if (parts.length === 2) {
      const min = parseDelayValue(parts[0].trim());
      const max = parseDelayValue(parts[1].trim());
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        return { min, max };
      }
    } else if (parts.length === 1) {
      const delay = parseDelayValue(parts[0].trim());
      if (!isNaN(delay)) {
        return { min: delay, max: delay };
      }
    }
  }

  // Fallback to default medium range if parsing fails
  return ranges.medium;
}
