import { Page } from 'playwright';
import { findElementSmart } from '../utils/element-finder';
import { retryWithBackoff } from '../utils/retry-utils';
import { BaseTask } from './BaseTask';
import { TaskOptions, AutomationInstance, TaskResult } from '../types/tasks';

import { loggable } from '../utils/decorators';

/**
 * @fileoverview Modular Twitter follow task using the BaseTask structure.
 */

interface TaskFollowTwitterOptions extends TaskOptions {
  likeFirstTweet?: boolean;
}

const DEFAULT_OPTIONS: TaskFollowTwitterOptions = {
  likeFirstTweet: false,
  verifyOnly: false,
  delayBetweenActions: true,
};

class TaskFollowTwitter extends BaseTask<TaskFollowTwitterOptions, string> {
  getTaskName(): string {
    return 'taskFollowTwitter';
  }

  getTaskIdentifier(username: string): string {
    return username;
  }

  @loggable
  async navigate(username: string): Promise<void> {
    const cleanHandle = username.replace('@', '');
    const profileUrl = `https://x.com/${cleanHandle}`;
    await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page.waitForSelector('main[role="main"]', { state: 'visible', timeout: 15000 });
  }

  @loggable
  async verifyLogin(): Promise<void> {
    try {
      const userNavSelector = '[data-testid="AppTabBar_Profile_Link"]';
      await this.page.waitForSelector(userNavSelector, { state: 'visible', timeout: 5000 });
    } catch (loginErr) {
      throw new Error('Not logged into Twitter/X or user navigation not found');
    }
  }

  @loggable
  async isAlreadyCompleted(username: string): Promise<boolean> {
    const result = await this.verify(username);
    return result.success;
  }

  @loggable
  async execute(username: string): Promise<void> {
    // Optional: Like first tweet
    if (this.options.likeFirstTweet) {
      await this.likeFirstTweet(username);
    }

    // Find and click follow button
    const cleanHandle = username.replace('@', '');
    const followSelectors = this.selectors.twitter.follow.map((s: string) => s.replace('{handle}', cleanHandle));
    await this.findAndClick(followSelectors, `follow button for ${username}`);
  }

  @loggable
  async verify(username: string): Promise<TaskResult> {
    const cleanHandle = username.replace('@', '');
    const verifySelectors = this.selectors.twitter.following.map((s: string) => s.replace('{handle}', cleanHandle));

    try {
      await retryWithBackoff(() => findElementSmart(this.page, verifySelectors, 5000));
      return { success: true, data: { verification: 'following_state' } };
    } catch (err) {
      // Stronger fallback: only succeed if on the correct profile page, but return a specific message.
      const currentUrl = this.page.url();
      if (currentUrl.includes(cleanHandle)) {
        return { success: false, error: 'Not following, but on the correct profile page.' };
      }
      return { success: false, error: 'No following indicator found and not on the profile page.' };
    }
  }

  private async likeFirstTweet(username: string): Promise<void> {
    this.logger(`Attempt to like 1st tweet for ${username}`);
    try {
      const likeSelectors = this.selectors.twitter.like;
      await this.findAndClick(likeSelectors, 'like button', 5000);
      this.logger(`  ❤️ Liked 1st tweet on ${username}`);
      await this.automation.delay('short');
    } catch (likeErr) {
      this.logger(`  ⚠️  Skip liking tweet on ${username}: ${likeErr.message}`);
    }
  }
}

export const type = 'twitterFollow';

export async function run(
  page: Page,
  automation: AutomationInstance,
  username: string,
  options: TaskFollowTwitterOptions = {},
  profileId: string | null = null,
  profileName: string | null = null,
  selectors: any,
): Promise<TaskResult> {
  const task = new TaskFollowTwitter(page, automation, { ...DEFAULT_OPTIONS, ...options }, profileId, profileName, selectors);
  return task.run(username);
}
