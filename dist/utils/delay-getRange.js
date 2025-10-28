"use strict";
/**
 * delay-getRange.ts
 * Returns delay range in milliseconds based on profile name
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDelayRange = getDelayRange;
/**
 * Returns delay range in milliseconds based on profile name
 * @param {DelayProfile} profile - Delay profile
 * @returns {DelayRange} Delay range object
 */
function getDelayRange(profile = 'medium') {
    const ranges = {
        instant: { min: 0, max: 50 },
        short: { min: 100, max: 500 },
        medium: { min: 500, max: 1500 },
        long: { min: 1500, max: 3000 },
    };
    return ranges[profile] || ranges.medium;
}
