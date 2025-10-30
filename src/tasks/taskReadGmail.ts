import { Page } from 'playwright';
import { BaseTask } from './BaseTask';
import { TaskOptions, AutomationInstance, TaskResult } from '../types/tasks';
import { getDelayRange } from '../utils/delay-getRange';

import { loggable } from '../utils/decorators';

/**
 * @fileoverview Modular Gmail read task using the BaseTask structure.
 */

interface TaskReadGmailOptions extends TaskOptions {
  randomDelay?: boolean;
}

const DEFAULT_OPTIONS: TaskReadGmailOptions = {
  randomDelay: true,
  verifyOnly: false,
};

class TaskReadGmail extends BaseTask<TaskReadGmailOptions, null> {
  getTaskName(): string {
    return 'taskReadGmail';
  }

  getTaskIdentifier(_data: null): string {
    return 'Gmail Inbox';
  }

  @loggable
  async navigate(_data: null): Promise<void> {
    const gmailUrl = 'https://mail.google.com/mail/u/0/#inbox';
    await this.page.goto(gmailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page.waitForSelector('table[role="grid"]', { state: 'visible', timeout: 15000 });
  }

  @loggable
  async verifyLogin(): Promise<void> {
    try {
      // More robust check for login status by looking for the account button
      const accountButtonSelector = 'a[href*="accounts.google.com"]';
      await this.page.waitForSelector(accountButtonSelector, { state: 'visible', timeout: 10000 });
      const userEmail = await this.page.locator(accountButtonSelector).getAttribute('aria-label');
      if (userEmail) {
        this.logger(`✅ Login verified for: ${userEmail}`);
      }
    } catch (loginErr) {
      throw new Error('Not logged into Gmail or account button not found');
    }
  }

  @loggable
  async isAlreadyCompleted(_data: null): Promise<boolean> {
    // This task is about reading, so it's never "completed" in the same way as a follow/join task.
    return false;
  }

  @loggable
  async execute(_data: null): Promise<void> {
    if (this.options.randomDelay) {
      this.logger('Add random delay before clicking mail');
      await this.automation.delay('medium');
    }

    const firstMailSelectors = this.selectors.gmail.firstMail;
    await this.findAndClick(firstMailSelectors, 'first email in inbox');

    // Simulate reading the email
    const { min, max } = getDelayRange('reading');
    const readingDelay = Math.floor(Math.random() * (max - min) + min);
    this.logger(`Simulate reading email for ${Math.round(readingDelay / 1000)}s.`);
    await this.page.waitForTimeout(readingDelay);
  }

  @loggable
  async verify(_data: null): Promise<TaskResult> {
    // Verification for this task means the inbox is loaded and we are logged in.
    // The actual reading action is transient.
    return { success: true, data: { action: 'verified_inbox_loaded' } };
  }
}

export const type = 'gmailRead';

export async function run(
  page: Page,
  automation: AutomationInstance,
  _data: any, // Data is not used for this task, but the signature must match
  options: TaskReadGmailOptions = {},
  profileId: string | null = null,
  profileName: string | null = null,
  selectors: any,
): Promise<TaskResult> {
  const task = new TaskReadGmail(page, automation, { ...DEFAULT_OPTIONS, ...options }, profileId, profileName, selectors);
  return task.run(null);
}
