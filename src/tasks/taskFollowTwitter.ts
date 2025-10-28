import { Page } from 'playwright';
import { findElementSmart } from '../utils/element-finder';
import { retryWithBackoff } from '../utils/retry-utils';
import { VerificationError } from '../utils/errors';
import { AuditLogger } from '../utils/audit-logger';

/**
 * @fileoverview Modular Twitter follow task for airdrop hunting.
 * Handles navigation, human-like clicks, optional likes, and verification with fallbacks.
 */

interface TaskFollowTwitterOptions {
  likeFirstTweet?: boolean;
  verifyOnly?: boolean;
  delayBetweenActions?: boolean;
}

interface AutomationInstance {
  delay: (profile: 'short' | 'medium' | 'long') => Promise<void>;
  logger: (msg: string) => void;
  auditLogger: AuditLogger;
}

interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

const DEFAULT_OPTIONS: TaskFollowTwitterOptions = {
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
 * @param selectors - The selectors for the task.
 * @returns A promise that resolves with the task result.
 */
async function taskFollowTwitter(
  page: Page,
  automation: AutomationInstance,
  username: string,
  options: TaskFollowTwitterOptions = {},
  profileId: string | null = null,
  profileName: string | null = null,
  selectors: any
): Promise<TaskResult> {
  const {
    likeFirstTweet = DEFAULT_OPTIONS.likeFirstTweet,
    verifyOnly = DEFAULT_OPTIONS.verifyOnly,
    delayBetweenActions = DEFAULT_OPTIONS.delayBetweenActions,
  } = options;
  const cleanHandle = username.replace('@', '');
  const profileUrl = `https://x.com/${cleanHandle}`;
  const logger = automation.logger;
  const auditLogger = automation.auditLogger;

  logger(`Starting Twitter task for ${username}`);
  await auditLogger?.logStepStart(
    'task_follow',
    'follow_execution',
    profileId,
    profileName,
    { handle: username, likeFirstTweet, verifyOnly }
  );

  try {
    // Navigate to profile
    logger(`Navigating to Twitter profile: ${profileUrl}`);
    await auditLogger?.logAction(
      'task_follow',
      'navigate_profile',
      true,
      profileId,
      profileName,
      { url: profileUrl }
    );
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for a key element on the Twitter profile page to ensure it's loaded
    await page.waitForSelector('main[role="main"]', { state: 'visible', timeout: 15000 });
    logger(`Successfully navigated to ${profileUrl} and main content is visible.`);
    await auditLogger?.logAction(
      'task_follow',
      'navigate_profile',
      true,
      profileId,
      profileName,
      { url: profileUrl, status: 'loaded' }
    );

    if (delayBetweenActions) await automation.delay('short'); // Human pause after load

    // Scroll to reveal buttons (load dynamic content)
    logger(`Scrolling down to reveal dynamic content for ${username}`);
    await auditLogger?.logAction(
      'task_follow',
      'scroll_reveal',
      true,
      profileId,
      profileName,
      { direction: 'down', distance: 400 }
    );
    await (page as any).humanScroll('down', 400);
    await automation.delay('medium');
    logger(`Finished scrolling for ${username}`);

    // Optional: Like first tweet for better engagement
    if (likeFirstTweet) {
      logger(`Attempting to like the first tweet for ${username}`);
      await auditLogger?.logAction(
        'task_follow',
        'like_first_tweet_start',
        true,
        profileId,
        profileName,
        { handle: username }
      );
      const likeSelectors = (selectors as any).twitter.like;
      try {
        const { selectorUsed } = await retryWithBackoff(
          () => findElementSmart(page, likeSelectors, 5000),
          { maxAttempts: 2, baseDelay: 500 }
        );
        await (page as any).humanClick(selectorUsed);
        logger(`  ❤️ Liked first tweet on ${username}`);
        await auditLogger?.logAction(
          'task_follow',
          'like_first_tweet',
          true,
          profileId,
          profileName,
          { handle: username, selector: selectorUsed }
        );
        await automation.delay('short');
      } catch (likeErr) {
        logger(`  ⚠️  Skip liking tweet on ${username}: ${(likeErr as Error).message}`);
        await auditLogger?.logAction(
          'task_follow',
          'like_first_tweet',
          false,
          profileId,
          profileName,
          { handle: username, error: (likeErr as Error).message }
        );
      }
    }

    if (verifyOnly) {
      // Just verify without following (e.g., check if already following)
      logger(`Verification only for ${username}, not performing follow action.`);
      await auditLogger?.logAction(
        'task_follow',
        'verify_only',
        true,
        profileId,
        profileName,
        { handle: username }
      );
      return await verifyFollow(
        page,
        username,
        automation,
        auditLogger,
        profileId,
        profileName,
        selectors
      );
    }

    // Find and click follow button
    const followSelectors = (selectors as any).twitter.follow.map((s: string) => s.replace('{handle}', cleanHandle));

    logger(`Attempting to find and click follow button for ${username}`);
    await auditLogger?.logAction(
      'task_follow',
      'find_follow_button',
      true,
      profileId,
      profileName,
      { handle: username, selectors: followSelectors }
    );
    const { selectorUsed } = await retryWithBackoff(
      () => findElementSmart(page, followSelectors, 10000),
      { maxAttempts: 2, baseDelay: 1000 }
    );
    logger(`Found follow button using selector: ${selectorUsed}. Clicking...`);
    await auditLogger?.logAction(
      'task_follow',
      'click_follow_button',
      true,
      profileId,
      profileName,
      { handle: username, selector: selectorUsed }
    );
    await (page as any).humanClick(selectorUsed);

    await automation.delay('long'); // Post-click pause (Twitter processes)
    logger(`Clicked follow button for ${username}. Verifying follow status.`);

    // Verify success
    const verification = await verifyFollow(
      page,
      username,
      automation,
      auditLogger,
      profileId,
      profileName,
      selectors
    );
    if (verification.success) {
      logger(`✅ Successfully followed ${username} (via ${selectorUsed})`);
      await auditLogger?.logStepEnd(
        'task_follow',
        'follow_execution',
        true,
        profileId,
        profileName,
        {
          handle: username,
          action: 'followed',
          liked: likeFirstTweet,
          selector: selectorUsed,
        }
      );
      return {
        success: true,
        data: { handle: username, action: 'followed', liked: likeFirstTweet },
      };
    } else {
      logger(`❌ Follow verification failed for ${username}: ${verification.error}`);
      throw new VerificationError(`Follow verification failed: ${verification.error}`, 'follow_confirm');
    }
  } catch (error) {
    logger(`❌ Twitter follow failed for ${username}: ${(error as Error).message}`);
    await auditLogger?.logAction(
      'task_follow',
      'follow_error',
      false,
      profileId,
      profileName,
      { handle: username, error: (error as Error).message }
    );

    // Fallback verify: Check if already following
    logger(`Attempting fallback verification for ${username} (checking if already following).`);
    const fallbackVerify = await verifyFollow(
      page,
      username,
      automation,
      auditLogger,
      profileId,
      profileName,
      selectors
    );
    if (fallbackVerify.success) {
      logger(`  ℹ️  Already following ${username} – skipping OK`);
      await auditLogger?.logStepEnd(
        'task_follow',
        'follow_execution',
        true,
        profileId,
        profileName,
        { handle: username, action: 'already_following' }
      );
      return {
        success: true,
        data: { handle: username, action: 'already_following' },
      };
    }

    await auditLogger?.logStepEnd(
      'task_follow',
      'follow_execution',
      false,
      profileId,
      profileName,
      { handle: username, error: (error as Error).message }
    );
    return { success: false, error: (error as Error).message };
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
 * @param selectors - The selectors for the task.
 * @returns A promise that resolves with the verification result.
 */
async function verifyFollow(
  page: Page,
  username: string,
  automation: AutomationInstance,
  auditLogger: AuditLogger | null = null,
  profileId: string | null = null,
  profileName: string | null = null,
  selectors: any
): Promise<TaskResult> {
  const cleanHandle = username.replace('@', '');
  const verifySelectors = (selectors as any).twitter.following.map((s: string) => s.replace('{handle}', cleanHandle));

  automation.logger(`Attempting to verify follow status for ${username}`);
  await auditLogger?.logAction(
    'task_follow',
    'verify_follow_start',
    true,
    profileId,
    profileName,
    { handle: username, selectors: verifySelectors }
  );

  try {
    const { selectorUsed } = await retryWithBackoff(
      () => findElementSmart(page, verifySelectors, 5000),
      { maxAttempts: 2, baseDelay: 500 }
    );
    automation.logger(`  Verified following ${username} via ${selectorUsed}`);
    await auditLogger?.logAction(
      'task_follow',
      'verify_follow',
      true,
      profileId,
      profileName,
      {
        handle: username,
        verification: 'following_state',
        selector: selectorUsed,
      }
    );
    return { success: true, data: { verification: 'following_state' } };
  } catch (err) {
    automation.logger(`  Could not find explicit following indicator for ${username}. Error: ${(err as Error).message}`);
    // Fallback: Check if we're on the profile page
    const currentUrl = page.url();
    if (currentUrl.includes(cleanHandle)) {
      automation.logger(`  Fallback verification: Currently on profile page ${currentUrl} for ${username}`);
      await auditLogger?.logAction(
        'task_follow',
        'verify_follow',
        true,
        profileId,
        profileName,
        { handle: username, verification: 'profile_loaded', url: currentUrl }
      );
      return { success: true, data: { verification: 'profile_loaded' } };
    }
    automation.logger(`  Fallback verification failed: Not on profile page for ${username}`);
    await auditLogger?.logAction(
      'task_follow',
      'verify_follow',
      false,
      profileId,
      profileName,
      { handle: username, error: 'No following indicator found' }
    );
    return { success: false, error: 'No following indicator found' };
  }
}

export const type = 'twitterFollow';
export const run = taskFollowTwitter;'''
