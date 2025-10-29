import { Page } from 'playwright';
import { findElementSmart } from '../utils/element-finder';
import { retryWithBackoff } from '../utils/retry-utils';
import { VerificationError } from '../utils/errors';
import { AuditLogger } from '../utils/audit-logger';

/**
 * @fileoverview Modular Discord server join task for community engagement.
 * Handles navigation to invite links, accepting invites, and verification with fallbacks.
 */

interface TaskJoinDiscordOptions {
  verifyOnly?: boolean;
  delayBetweenActions?: boolean;
  waitForCaptcha?: boolean;
}

interface AutomationInstance {
  delay: (_profile: 'short' | 'medium' | 'long') => Promise<void>;
  logger: (_msg: string) => void;
  auditLogger: AuditLogger;
}

interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

const DEFAULT_OPTIONS: TaskJoinDiscordOptions = {
  verifyOnly: false, // If true, just check without joining
  delayBetweenActions: true,
  waitForCaptcha: false, // Discord rarely has captchas for invites
};

/**
 * Performs the Discord server join task using an invite link.
 * @param page - The enhanced Playwright page with human-like methods.
 * @param automation - The automation instance with delay and logger.
 * @param inviteUrl - The Discord invite URL, e.g., 'https://discord.gg/abc123'.
 * @param options - Task options.
 * @param profileId - The profile ID for audit logging.
 * @param profileName - The profile name for audit logging.
 * @param selectors - The selectors for the task.
 * @returns A promise that resolves with the task result.
 */
async function taskJoinDiscord(
  page: Page,
  automation: AutomationInstance,
  inviteUrl: string,
  options: TaskJoinDiscordOptions = {},
  profileId: string | null = null,
  profileName: string | null = null,
  selectors: any,
): Promise<TaskResult> {
  const {
    verifyOnly = DEFAULT_OPTIONS.verifyOnly,
    delayBetweenActions = DEFAULT_OPTIONS.delayBetweenActions,
    waitForCaptcha = DEFAULT_OPTIONS.waitForCaptcha,
  } = options;
  const logger = automation.logger;
  const auditLogger = automation.auditLogger;

  logger(`Starting Discord join task for ${inviteUrl}`);
  await auditLogger?.logStepStart(
    'task_join_discord',
    'join_execution',
    profileId,
    profileName,
    { inviteUrl, verifyOnly, waitForCaptcha },
  );

  try {
    // Navigate to invite URL
    logger(`Navigating to Discord invite: ${inviteUrl}`);
    await auditLogger?.logAction(
      'task_join_discord',
      'navigate_invite',
      true,
      profileId,
      profileName,
      { url: inviteUrl },
    );
    await page.goto(inviteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for Discord page to load - look for main content or invite elements
    await page.waitForSelector('div[class*="invite-"], button, main', { state: 'visible', timeout: 15000 });
    logger(`Successfully navigated to ${inviteUrl} and content is visible.`);
    await auditLogger?.logAction(
      'task_join_discord',
      'navigate_invite',
      true,
      profileId,
      profileName,
      { url: inviteUrl, status: 'loaded' },
    );

    if (delayBetweenActions) await automation.delay('short'); // Human pause after load

    // Check if already joined (look for channel/sidebar elements)
    if (await isAlreadyJoined(page, selectors)) {
      logger(`Already joined Discord server from ${inviteUrl}`);
      await auditLogger?.logStepEnd(
        'task_join_discord',
        'join_execution',
        true,
        profileId,
        profileName,
        { inviteUrl, action: 'already_joined' },
      );
      return {
        success: true,
        data: { inviteUrl, action: 'already_joined' },
      };
    }

    if (verifyOnly) {
      // Just verify without joining
      logger(`Verification only for ${inviteUrl}, not performing join action.`);
      await auditLogger?.logAction(
        'task_join_discord',
        'verify_only',
        true,
        profileId,
        profileName,
        { inviteUrl },
      );
      return await verifyJoin(
        page,
        inviteUrl,
        automation,
        auditLogger,
        profileId,
        profileName,
        selectors,
      );
    }

    // Optional: Wait for captcha if enabled
    if (waitForCaptcha) {
      logger(`Waiting for potential captcha on ${inviteUrl}`);
      await automation.delay('long');
      // Note: Discord rarely uses captchas for invites, but this allows for manual solving
    }

    // Find and click accept invite/join server button
    const joinSelectors = (selectors as any).discord.acceptInvite.concat((selectors as any).discord.joinServer);

    logger(`Attempting to find and click join button for ${inviteUrl}`);
    await auditLogger?.logAction(
      'task_join_discord',
      'find_join_button',
      true,
      profileId,
      profileName,
      { inviteUrl, selectors: joinSelectors },
    );

    const { selectorUsed } = await retryWithBackoff(
      () => findElementSmart(page, joinSelectors, 10000),
      { maxAttempts: 3, baseDelay: 1000 },
    );

    logger(`Found join button using selector: ${selectorUsed}. Clicking...`);
    await auditLogger?.logAction(
      'task_join_discord',
      'click_join_button',
      true,
      profileId,
      profileName,
      { inviteUrl, selector: selectorUsed },
    );
    await (page as any).humanClick(selectorUsed);

    await automation.delay('long'); // Post-click pause (Discord processes join)
    logger(`Clicked join button for ${inviteUrl}. Verifying join status.`);

    // Verify success
    const verification = await verifyJoin(
      page,
      inviteUrl,
      automation,
      auditLogger,
      profileId,
      profileName,
      selectors,
    );

    if (verification.success) {
      logger(`✅ Successfully joined Discord server from ${inviteUrl} (via ${selectorUsed})`);
      await auditLogger?.logStepEnd(
        'task_join_discord',
        'join_execution',
        true,
        profileId,
        profileName,
        {
          inviteUrl,
          action: 'joined',
          selector: selectorUsed,
        },
      );
      return {
        success: true,
        data: { inviteUrl, action: 'joined' },
      };
    } else {
      logger(`❌ Join verification failed for ${inviteUrl}: ${verification.error}`);
      throw new VerificationError(`Join verification failed: ${verification.error}`, 'join_confirm');
    }
  } catch (error) {
    logger(`❌ Discord join failed for ${inviteUrl}: ${(error as Error).message}`);
    await auditLogger?.logAction(
      'task_join_discord',
      'join_error',
      false,
      profileId,
      profileName,
      { inviteUrl, error: (error as Error).message },
    );

    // Fallback verify: Check if already joined
    logger(`Attempting fallback verification for ${inviteUrl} (checking if already joined).`);
    const fallbackVerify = await verifyJoin(
      page,
      inviteUrl,
      automation,
      auditLogger,
      profileId,
      profileName,
      selectors,
    );
    if (fallbackVerify.success) {
      logger(`  ℹ️  Already joined Discord server from ${inviteUrl} – skipping OK`);
      await auditLogger?.logStepEnd(
        'task_join_discord',
        'join_execution',
        true,
        profileId,
        profileName,
        { inviteUrl, action: 'already_joined' },
      );
      return {
        success: true,
        data: { inviteUrl, action: 'already_joined' },
      };
    }

    await auditLogger?.logStepEnd(
      'task_join_discord',
      'join_execution',
      false,
      profileId,
      profileName,
      { inviteUrl, error: (error as Error).message },
    );
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Helper function to check if already joined the server.
 * @param page - The Playwright page instance.
 * @param selectors - The selectors for the task.
 * @returns A promise that resolves with boolean indicating join status.
 */
async function isAlreadyJoined(page: Page, selectors: any): Promise<boolean> {
  try {
    const verifySelectors = (selectors as any).discord.verifyJoin;
    await findElementSmart(page, verifySelectors, 3000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper function to verify the join status.
 * @param page - The Playwright page instance.
 * @param inviteUrl - The Discord invite URL.
 * @param automation - The automation instance.
 * @param auditLogger - The audit logger instance.
 * @param profileId - The profile ID.
 * @param profileName - The profile name.
 * @param selectors - The selectors for the task.
 * @returns A promise that resolves with the verification result.
 */
async function verifyJoin(
  page: Page,
  inviteUrl: string,
  automation: AutomationInstance,
  auditLogger: AuditLogger | null = null,
  profileId: string | null = null,
  profileName: string | null = null,
  selectors: any,
): Promise<TaskResult> {
  const verifySelectors = (selectors as any).discord.verifyJoin;

  automation.logger(`Attempting to verify join status for ${inviteUrl}`);
  await auditLogger?.logAction(
    'task_join_discord',
    'verify_join_start',
    true,
    profileId,
    profileName,
    { inviteUrl, selectors: verifySelectors },
  );

  try {
    const { selectorUsed } = await retryWithBackoff(
      () => findElementSmart(page, verifySelectors, 5000),
      { maxAttempts: 2, baseDelay: 500 },
    );
    automation.logger(`  Verified joined Discord server from ${inviteUrl} via ${selectorUsed}`);
    await auditLogger?.logAction(
      'task_join_discord',
      'verify_join',
      true,
      profileId,
      profileName,
      {
        inviteUrl,
        verification: 'server_joined',
        selector: selectorUsed,
      },
    );
    return { success: true, data: { verification: 'server_joined' } };
  } catch (err) {
    automation.logger(`  Could not find server content for ${inviteUrl}. Error: ${(err as Error).message}`);
    // Fallback: Check current URL - if redirected to Discord app/channel, likely joined
    const currentUrl = page.url();
    if (currentUrl.includes('discord.com/channels/') || currentUrl.includes('discordapp.com/channels/')) {
      automation.logger(`  Fallback verification: Redirected to channel ${currentUrl} for ${inviteUrl}`);
      await auditLogger?.logAction(
        'task_join_discord',
        'verify_join',
        true,
        profileId,
        profileName,
        { inviteUrl, verification: 'redirected_to_channel', url: currentUrl },
      );
      return { success: true, data: { verification: 'redirected_to_channel' } };
    }
    automation.logger(`  Fallback verification failed: Not in server for ${inviteUrl}`);
    await auditLogger?.logAction(
      'task_join_discord',
      'verify_join',
      false,
      profileId,
      profileName,
      { inviteUrl, error: 'No server content found' },
    );
    return { success: false, error: 'No server content found' };
  }
}

export const type = 'discordJoin';
export const run = taskJoinDiscord;
