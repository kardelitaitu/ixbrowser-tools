import { Page } from 'playwright';
import { findElementSmart } from '../utils/element-finder';
import { retryWithBackoff } from '../utils/retry-utils';
import { BaseTask } from './BaseTask';
import { TaskOptions, AutomationInstance, TaskResult } from '../types/tasks';

import { loggable } from '../utils/decorators';

/**
 * @fileoverview Modular Discord server join task using the BaseTask structure.
 */

interface TaskJoinDiscordOptions extends TaskOptions {
  waitForCaptcha?: boolean;
}

const DEFAULT_OPTIONS: TaskJoinDiscordOptions = {
  verifyOnly: false,
  delayBetweenActions: true,
  waitForCaptcha: false,
};

class TaskJoinDiscord extends BaseTask<TaskJoinDiscordOptions, string> {
  getTaskName(): string {
    return 'taskJoinDiscord';
  }

  getTaskIdentifier(inviteUrl: string): string {
    return inviteUrl;
  }

  @loggable
  async navigate(inviteUrl: string): Promise<void> {
    await this.page.goto(inviteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page.waitForSelector('div[class*="invite-"], button, main', { state: 'visible', timeout: 15000 });
  }

  @loggable
  async verifyLogin(): Promise<void> {
    // Discord login is implicitly verified by the ability to see the invite screen
    // or being redirected to the channel. A more explicit check could be added
    // by looking for user-specific elements if needed.
    this.logger('✅ Assuming logged in if invite screen is visible');
  }

  @loggable
  async isAlreadyCompleted(_inviteUrl: string): Promise<boolean> {
    try {
      const verifySelectors = this.selectors.discord.verifyJoin;
      await findElementSmart(this.page, verifySelectors, 3000);
      return true;
    } catch {
      return false;
    }
  }

  @loggable
  async execute(_inviteUrl: string): Promise<void> {
    if (this.options.waitForCaptcha) {
      this.logger('Pausing for potential captcha...');
      await this.automation.delay('long');
    }

    const joinSelectors = [...this.selectors.discord.acceptInvite, ...this.selectors.discord.joinServer];
    await this.findAndClick(joinSelectors, `join button for ${_inviteUrl}`);
  }

  @loggable
  async verify(_inviteUrl: string): Promise<TaskResult> {
    try {
      const verifySelectors = this.selectors.discord.verifyJoin;
      const { selectorUsed } = await retryWithBackoff(() => findElementSmart(this.page, verifySelectors, 5000));
      this.logger(`  Verified joined Discord server via ${selectorUsed}`);
      return { success: true, data: { verification: 'server_joined' } };
    } catch (err) {
      const currentUrl = this.page.url();
      if (currentUrl.includes('discord.com/channels/')) {
        this.logger(`  Fallback verify: Redirected to channel ${currentUrl}`);
        return { success: true, data: { verification: 'redirected_to_channel' } };
      }
      return { success: false, error: 'No server content found and not redirected to a channel.' };
    }
  }
}

export const type = 'discordJoin';

export async function run(
  page: Page,
  automation: AutomationInstance,
  inviteUrl: string,
  options: TaskJoinDiscordOptions = {},
  profileId: string | null = null,
  profileName: string | null = null,
  selectors: any,
): Promise<TaskResult> {
  const task = new TaskJoinDiscord(page, automation, { ...DEFAULT_OPTIONS, ...options }, profileId, profileName, selectors);
  return task.run(inviteUrl);
}
