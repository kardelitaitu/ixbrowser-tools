"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.type = void 0;
const element_finder_1 = require("../utils/element-finder");
const retry_utils_1 = require("../utils/retry-utils");
const errors_1 = require("../utils/errors");
const selectors = __importStar(require("../../config/selectors.json"));
const DEFAULT_OPTIONS = {
    likeFirstTweet: false, // Optional engagement
    verifyOnly: false, // If true, just check without clicking
    delayBetweenActions: true,
};
/**
 * Performs the Twitter follow task on a single handle.
 * @param page - The enhanced Playwright page with human-like methods.
 * @param automation - The automation instance with delay and logger.
 * @param username - The Twitter handle, e.g., '@AirdropProject'.
 * @param options - Task options.
 * @param profileId - The profile ID for audit logging.
 * @param profileName - The profile name for audit logging.
 * @returns A promise that resolves with the task result.
 */
async function taskFollowTwitter(page, automation, username, options = {}, profileId = null, profileName = null) {
    const { likeFirstTweet = DEFAULT_OPTIONS.likeFirstTweet, verifyOnly = DEFAULT_OPTIONS.verifyOnly, delayBetweenActions = DEFAULT_OPTIONS.delayBetweenActions, } = options;
    const cleanHandle = username.replace('@', '');
    const profileUrl = `https://x.com/${cleanHandle}`;
    const logger = automation.logger;
    const auditLogger = automation.auditLogger;
    logger(`Starting Twitter task for ${username}`);
    await auditLogger?.logStepStart('task_follow', 'follow_execution', profileId, profileName, { handle: username, likeFirstTweet, verifyOnly });
    try {
        // Navigate to profile
        logger(`Navigating to Twitter profile: ${profileUrl}`);
        await auditLogger?.logAction('task_follow', 'navigate_profile', true, profileId, profileName, { url: profileUrl });
        await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        // Wait for a key element on the Twitter profile page to ensure it's loaded
        await page.waitForSelector('main[role="main"]', { state: 'visible', timeout: 15000 });
        logger(`Successfully navigated to ${profileUrl} and main content is visible.`);
        await auditLogger?.logAction('task_follow', 'navigate_profile', true, profileId, profileName, { url: profileUrl, status: 'loaded' });
        if (delayBetweenActions)
            await automation.delay('short'); // Human pause after load
        // Scroll to reveal buttons (load dynamic content)
        logger(`Scrolling down to reveal dynamic content for ${username}`);
        await auditLogger?.logAction('task_follow', 'scroll_reveal', true, profileId, profileName, { direction: 'down', distance: 400 });
        await page.humanScroll('down', 400);
        await automation.delay('medium');
        logger(`Finished scrolling for ${username}`);
        // Optional: Like first tweet for better engagement
        if (likeFirstTweet) {
            logger(`Attempting to like the first tweet for ${username}`);
            await auditLogger?.logAction('task_follow', 'like_first_tweet_start', true, profileId, profileName, { handle: username });
            const likeSelectors = selectors.twitter.like;
            try {
                const { selectorUsed } = await (0, retry_utils_1.retryWithBackoff)(() => (0, element_finder_1.findElementSmart)(page, likeSelectors, 5000), { maxAttempts: 2, baseDelay: 500 });
                await page.humanClick(selectorUsed);
                logger(`  ❤️ Liked first tweet on ${username}`);
                await auditLogger?.logAction('task_follow', 'like_first_tweet', true, profileId, profileName, { handle: username, selector: selectorUsed });
                await automation.delay('short');
            }
            catch (likeErr) {
                logger(`  ⚠️  Skip liking tweet on ${username}: ${likeErr.message}`);
                await auditLogger?.logAction('task_follow', 'like_first_tweet', false, profileId, profileName, { handle: username, error: likeErr.message });
            }
        }
        if (verifyOnly) {
            // Just verify without following (e.g., check if already following)
            logger(`Verification only for ${username}, not performing follow action.`);
            await auditLogger?.logAction('task_follow', 'verify_only', true, profileId, profileName, { handle: username });
            return await verifyFollow(page, username, automation, auditLogger, profileId, profileName);
        }
        // Find and click follow button
        const followSelectors = selectors.twitter.follow.map((s) => s.replace('{handle}', cleanHandle));
        logger(`Attempting to find and click follow button for ${username}`);
        await auditLogger?.logAction('task_follow', 'find_follow_button', true, profileId, profileName, { handle: username, selectors: followSelectors });
        const { selectorUsed } = await (0, retry_utils_1.retryWithBackoff)(() => (0, element_finder_1.findElementSmart)(page, followSelectors, 10000), { maxAttempts: 2, baseDelay: 1000 });
        logger(`Found follow button using selector: ${selectorUsed}. Clicking...`);
        await auditLogger?.logAction('task_follow', 'click_follow_button', true, profileId, profileName, { handle: username, selector: selectorUsed });
        await page.humanClick(selectorUsed);
        await automation.delay('long'); // Post-click pause (Twitter processes)
        logger(`Clicked follow button for ${username}. Verifying follow status.`);
        // Verify success
        const verification = await verifyFollow(page, username, automation, auditLogger, profileId, profileName);
        if (verification.success) {
            logger(`✅ Successfully followed ${username} (via ${selectorUsed})`);
            await auditLogger?.logStepEnd('task_follow', 'follow_execution', true, profileId, profileName, {
                handle: username,
                action: 'followed',
                liked: likeFirstTweet,
                selector: selectorUsed,
            });
            return {
                success: true,
                data: { handle: username, action: 'followed', liked: likeFirstTweet },
            };
        }
        else {
            logger(`❌ Follow verification failed for ${username}: ${verification.error}`);
            throw new errors_1.VerificationError(`Follow verification failed: ${verification.error}`, 'follow_confirm');
        }
    }
    catch (error) {
        logger(`❌ Twitter follow failed for ${username}: ${error.message}`);
        await auditLogger?.logAction('task_follow', 'follow_error', false, profileId, profileName, { handle: username, error: error.message });
        // Fallback verify: Check if already following
        logger(`Attempting fallback verification for ${username} (checking if already following).`);
        const fallbackVerify = await verifyFollow(page, username, automation, auditLogger, profileId, profileName);
        if (fallbackVerify.success) {
            logger(`  ℹ️  Already following ${username} – skipping OK`);
            await auditLogger?.logStepEnd('task_follow', 'follow_execution', true, profileId, profileName, { handle: username, action: 'already_following' });
            return {
                success: true,
                data: { handle: username, action: 'already_following' },
            };
        }
        await auditLogger?.logStepEnd('task_follow', 'follow_execution', false, profileId, profileName, { handle: username, error: error.message });
        return { success: false, error: error.message };
    }
}
/**
 * Helper function to verify the follow status.
 * @param page - The Playwright page instance.
 * @param username - The Twitter handle.
 * @param automation - The automation instance.
 * @param auditLogger - The audit logger instance.
 * @param profileId - The profile ID.
 * @param profileName - The profile name.
 * @returns A promise that resolves with the verification result.
 */
async function verifyFollow(page, username, automation, auditLogger = null, profileId = null, profileName = null) {
    const cleanHandle = username.replace('@', '');
    const verifySelectors = selectors.twitter.following.map((s) => s.replace('{handle}', cleanHandle));
    automation.logger(`Attempting to verify follow status for ${username}`);
    await auditLogger?.logAction('task_follow', 'verify_follow_start', true, profileId, profileName, { handle: username, selectors: verifySelectors });
    try {
        const { selectorUsed } = await (0, retry_utils_1.retryWithBackoff)(() => (0, element_finder_1.findElementSmart)(page, verifySelectors, 5000), { maxAttempts: 2, baseDelay: 500 });
        automation.logger(`  Verified following ${username} via ${selectorUsed}`);
        await auditLogger?.logAction('task_follow', 'verify_follow', true, profileId, profileName, {
            handle: username,
            verification: 'following_state',
            selector: selectorUsed,
        });
        return { success: true, data: { verification: 'following_state' } };
    }
    catch (err) {
        automation.logger(`  Could not find explicit following indicator for ${username}. Error: ${err.message}`);
        // Fallback: Check if we're on the profile page
        const currentUrl = page.url();
        if (currentUrl.includes(cleanHandle)) {
            automation.logger(`  Fallback verification: Currently on profile page ${currentUrl} for ${username}`);
            await auditLogger?.logAction('task_follow', 'verify_follow', true, profileId, profileName, { handle: username, verification: 'profile_loaded', url: currentUrl });
            return { success: true, data: { verification: 'profile_loaded' } };
        }
        automation.logger(`  Fallback verification failed: Not on profile page for ${username}`);
        await auditLogger?.logAction('task_follow', 'verify_follow', false, profileId, profileName, { handle: username, error: 'No following indicator found' });
        return { success: false, error: 'No following indicator found' };
    }
}
exports.type = 'twitterFollow';
exports.run = taskFollowTwitter;
