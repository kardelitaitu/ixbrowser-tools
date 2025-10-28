/**
 * delay-getRange.ts
 * Returns delay range in milliseconds based on profile name
 */

type DelayProfile = 'instant' | 'short' | 'medium' | 'long';

interface DelayRange {
  min: number;
  max: number;
}

/**
 * Returns delay range in milliseconds based on profile name
 * @param {DelayProfile} profile - Delay profile
 * @returns {DelayRange} Delay range object
 */
export function getDelayRange(profile: DelayProfile = 'medium'): DelayRange {
  const ranges: Record<DelayProfile, DelayRange> = {
    instant: { min: 0, max: 50 },
    short: { min: 100, max: 500 },
    medium: { min: 500, max: 1500 },
    long: { min: 1500, max: 3000 },
  };

  return ranges[profile] || ranges.medium;
}
