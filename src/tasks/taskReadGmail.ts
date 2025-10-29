import { Page } from 'playwright';
import { findElementSmart } from '../utils/element-finder';
import { retryWithBackoff } from '../utils/retry-utils';
import { AuditLogger } from '../utils/audit-logger';
import { getDelayRange } from '../utils/delay-getRange';

/**
 * @fileoverview Modular Gmail read task for automation.
 * Handles navigation to inbox, waiting for load, random delay, and clicking first mail.
 */

interface TaskReadGmailOptions {
  randomDelay?: boolean;
  verifyOnly?: boolean;
}

interface AutomationInstance {
  delay: (_profile: 'short' | 'medium' | 'long' | 'reading') => Promise<void>;
  logger: (_msg: string) => void;
  auditLogger: AuditLogger;
}

interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

const DEFAULT_OPTIONS: TaskReadGmailOptions = {
  randomDelay: true,
  verifyOnly: false,
};

/**
 * Performs the Gmail read task.
 * @param page - The enhanced Playwright page with human-like methods.
 * @param automation - The automation instance with delay and logger.
 * @param options - Task options.
 * @param profileId - The profile ID for audit logging.
 * @param profileName - The profile name for audit logging.
 * @param selectors - The selectors for the task.
 * @returns A promise that resolves with the task result.
 */
async function taskReadGmail(
  page: Page,
  automation: AutomationInstance,
  options: TaskReadGmailOptions = {},
  profileId: string | null = null,
  profileName: string | null = null,
  selectors: any,
): Promise<TaskResult> {
  const {
    randomDelay = DEFAULT_OPTIONS.randomDelay,
    verifyOnly = DEFAULT_OPTIONS.verifyOnly,
  } = options;
  const gmailUrl = 'https://mail.google.com/mail/u/0/#inbox';
  const logger = automation.logger;
  const auditLogger = automation.auditLogger;

  logger('Starting Gmail read task');
  await auditLogger?.logStepStart(
    'task_read_gmail',
    'gmail_read_execution',
    profileId,
    profileName,
    { randomDelay, verifyOnly },
  );

  try {
    // Navigate to Gmail inbox
    logger(`Navigating to Gmail inbox: ${gmailUrl}`);
    await auditLogger?.logAction(
      'task_read_gmail',
      'navigate_inbox',
      true,
      profileId,
      profileName,
      { url: gmailUrl },
    );
    await page.goto(gmailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for inbox to load - look for the table or main content
    await page.waitForSelector('table[role="grid"]', { state: 'visible', timeout: 15000 });
    logger('Successfully navigated to Gmail inbox and content is visible.');
    await auditLogger?.logAction(
      'task_read_gmail',
      'navigate_inbox',
      true,
      profileId,
      profileName,
      { url: gmailUrl, status: 'loaded' },
    );

    // Verify login status by checking page title
    const pageTitle = await page.title();
    logger(`Page title: ${pageTitle}`);
    const inboxRegex = /Inbox.*- (.+@.+\..+) - Gmail/;
    const match = pageTitle.match(inboxRegex);

    if (!match) {
      const errorMsg = 'Not logged into Gmail or invalid page title format';
      logger(`❌ ${errorMsg}. Title: ${pageTitle}`);
      await auditLogger?.logAction(
        'task_read_gmail',
        'verify_login',
        false,
        profileId,
        profileName,
        { pageTitle, error: errorMsg },
      );
      throw new Error(errorMsg);
    }

    const emailAddress = match[1];
    logger(`✅ Logged in as: ${emailAddress}`);
    await auditLogger?.logAction(
      'task_read_gmail',
      'verify_login',
      true,
      profileId,
      profileName,
      { emailAddress, pageTitle },
    );

    if (randomDelay) {
      logger('Adding random delay before clicking mail');
      await automation.delay('medium'); // Random delay
    }

    if (verifyOnly) {
      logger('Verification only - not clicking mail');
      await auditLogger?.logAction(
        'task_read_gmail',
        'verify_only',
        true,
        profileId,
        profileName,
        { emailAddress },
      );
      return { success: true, data: { action: 'verified_inbox_loaded', emailAddress } };
    }

    // Find and click first mail
    const firstMailSelectors = (selectors as any).gmail.firstMail;

    logger('Attempting to find and click first mail');
    await auditLogger?.logAction(
      'task_read_gmail',
      'find_first_mail',
      true,
      profileId,
      profileName,
      { selectors: firstMailSelectors },
    );
    const { selectorUsed } = await retryWithBackoff(
      () => findElementSmart(page, firstMailSelectors, 10000),
      { maxAttempts: 2, baseDelay: 1000 },
    );
    logger(`Found first mail using selector: ${selectorUsed}. Clicking...`);
    await auditLogger?.logAction(
      'task_read_gmail',
      'click_first_mail',
      true,
      profileId,
      profileName,
      { selector: selectorUsed },
    );
    await (page as any).humanClick(selectorUsed);

    await automation.delay('short'); // Post-click pause

    // Simulate reading the email for 2-3 minutes
    const { min, max } = getDelayRange('reading');
    const readingDelay = Math.random() * (max - min) + min;
    logger(`Simulating reading email for ${Math.round(readingDelay / 1000)} seconds...`);
    await auditLogger?.logAction(
      'task_read_gmail',
      'simulate_reading',
      true,
      profileId,
      profileName,
      { readingDelayMs: readingDelay },
    );
    await page.waitForTimeout(readingDelay);
    logger('Finished simulating email reading.');

    await auditLogger?.logStepEnd(
      'task_read_gmail',
      'gmail_read_execution',
      true,
      profileId,
      profileName,
      {
        action: 'read_first_mail',
        selector: selectorUsed,
        emailAddress,
        readingDelayMs: readingDelay,
      },
    );
    return {
      success: true,
      data: { action: 'read_first_mail', selector: selectorUsed, emailAddress, readingDelayMs: readingDelay },
    };
  } catch (error) {
    logger(`❌ Gmail read task failed: ${(error as Error).message}`);
    await auditLogger?.logAction(
      'task_read_gmail',
      'gmail_read_error',
      false,
      profileId,
      profileName,
      { error: (error as Error).message },
    );

    await auditLogger?.logStepEnd(
      'task_read_gmail',
      'gmail_read_execution',
      false,
      profileId,
      profileName,
      { error: (error as Error).message },
    );
    return { success: false, error: (error as Error).message };
  }
}

export const type = 'gmailRead';
export const run = taskReadGmail;
