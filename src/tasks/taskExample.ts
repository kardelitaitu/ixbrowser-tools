import { Page } from 'playwright';
import { BaseTask } from './BaseTask';
import { TaskOptions, AutomationInstance, TaskResult } from '../types/tasks';
import { loggable } from '../utils/decorators';

/**
 * @fileoverview Example task demonstrating common automation actions.
 * This task navigates to Google, types a search query, clicks the search button,
 * and then scrolls the page. It's designed to showcase how to use various
 * built-in automation features and how to configure them via options.
 *
    Here's a compact example for basic tasks, demonstrating direct selectors and manual delays after URL navigation.
    It usings 4 lines per action for precise logging. Expand with complex logic as needed.
    Tip: Ask an AI assistant for best selector from your element's code.
    Example:

      this.logger(`Typing "my new query"`);                                                             // Log the action
      await (this.page as any).humanType(['textarea[name="q"]', 'input[name="q"]'], 'my new query');    // Use humanType to type into the search box
      this.logger('Waiting 0.5s after Typing.');                                                        // Log the wait
      await this.automation.delay('0.5s');                                                              // Custom delay after typing

      this.logger('Clicking search button');                                                            // Log the action
      await this.findAndClick(['button[name="btnK"]', 'input[type="submit"]'], 'search button');        // Use findAndClick to locate and click the button
      this.logger('Waiting 2-3s after Clicking search button.');                                        // Log the wait
      await this.automation.delay('2-3s');                                                              // Custom delay after clicking

      this.logger('Clicking another button');                                                           // Log the action
      await this.findAndClick(['#imageSearchButton', 'text=Image Search'], 'click image button');       // Use findAndClick to locate and click another button
      this.logger('Waiting 1-2s after Clicking click image button.');                                   // Log the wait
      await this.automation.delay('1-2s');                                                              // Custom delay after clicking
*/

/**
 * Defines the specific options for the TaskExample.
 * These options can be configured in config/tasks.json.
 */
interface TaskExampleOptions extends TaskOptions {
  /**
   * The URL to navigate to at the start of the task.
   * Example in config/tasks.json: "targetUrl": "https://www.google.com"
   */
  targetUrl: string;
  /**
   * The text to type into the search bar.
   * Example in config/tasks.json: "searchQuery": "Playwright automation"
   */
  searchQuery: string;
  /**
   * An array of selectors to find and click the search button.
   * The task will try these selectors in order until one is found.
   * Example in config/tasks.json: "elementToClick": ["button[name='btnK']", "input[type='submit']"]
   * Refer to task-readme.md for more details on selectors.
   */
  elementToClick: string[];
  /**
   * An array of selectors to find the search input field to type into.
   * The task will try these selectors in order until one is found.
   * Example in config/tasks.json: "elementToType": ["textarea[name='q']", "input[name='q']"]
   * Refer to task-readme.md for more details on selectors.
   */
  elementToType: string[];
  /**
   * The amount in pixels to scroll down the page after the search.
   * Example in config/tasks.json: "scrollAmount": 500
   */
  scrollAmount?: number;
  /**
   * Custom delay to use after typing. Can be a predefined profile ('short', 'medium')
   * or a dynamic string (e.g., '0.5s', '1-2s').
   * Refer to task-readme.md for more details on delay formats.
   * Example in config/tasks.json: "delayAfterType": "0.5s"
   */
  delayAfterType?: string;
  /**
   * Custom delay to use after clicking.
   * Example in config/tasks.json: "delayAfterClick": "medium"
   *

   */
  delayAfterClick?: string;
  /**
   * Custom delay to use after scrolling.
   * Example in config/tasks.json: "delayAfterScroll": "1-3"
   */
  delayAfterScroll?: string;
}

/**
 * Default options for the TaskExample.
 * These values are used if not overridden in config/tasks.json.
 */
const DEFAULT_OPTIONS: TaskExampleOptions = {
  targetUrl: 'https://www.google.com',
  searchQuery: 'Playwright automation',
  elementToClick: ['button[name="btnK"]', 'input[type="submit"]'], // Common Google search button selectors
  elementToType: ['textarea[name="q"]', 'input[name="q"]'], // Common Google search input selectors
  verifyOnly: false, // Set to true in config/tasks.json to only verify, not execute
  delayBetweenActions: true, // Set to false in config/tasks.json to disable automatic delays
  scrollAmount: 500, // Default scroll amount in pixels
  delayAfterType: 'short', // Default delay after typing
  delayAfterClick: 'medium', // Default delay after clicking
  delayAfterScroll: 'short', // Default delay after scrolling
};

class TaskExample extends BaseTask<TaskExampleOptions, string> {
  getTaskName(): string {
    return 'taskExample';
  }

  getTaskIdentifier(_data: string): string {
    // The identifier for this task is the target URL, as it's the primary focus.
    return this.options.targetUrl;
  }

  @loggable
  async navigate(_data: string): Promise<void> {
    await this.page.goto(this.options.targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page.waitForLoadState('networkidle');
  }

  @loggable
  async verifyLogin(): Promise<void> {
    // For this example, we'll assume no specific login is needed for Google.
    // In a real scenario, this would involve checking for user-specific elements
    // or a successful login state.
    this.logger('Login verification skipped for example task.');
  }

  @loggable
  async isAlreadyCompleted(_data: string): Promise<boolean> {
    // For this example, we'll always run the task.
    // In a real scenario, this method would check for a completion indicator
    // (e.g., "Is the item already in the cart?", "Is the user already followed?").
    return false;
  }

  @loggable
  async execute(_data: string): Promise<void> {
    // --- Action 1: Type into a search box ---
    this.logger(`Typing "${this.options.searchQuery}"`);
    // Use humanType for realistic typing simulation
    await (this.page as any).humanType(this.options.elementToType, this.options.searchQuery);
    // Apply custom delay after typing, if configured
    if (this.options.delayBetweenActions && this.options.delayAfterType) {
      await this.automation.delay(this.options.delayAfterType);
    } else if (this.options.delayBetweenActions) {
      await this.automation.delay('short'); // Fallback to default 'short' if not specified
    }

    // --- Action 2: Click a search button ---
    this.logger('Clicking search button');
    // Use findAndClick to locate and click the button
    await this.findAndClick(this.options.elementToClick, 'search button');
    // Apply custom delay after clicking, if configured
    if (this.options.delayBetweenActions && this.options.delayAfterClick) {
      await this.automation.delay(this.options.delayAfterClick);
    } else if (this.options.delayBetweenActions) {
      await this.automation.delay('medium'); // Fallback to default 'medium'
    }

    // --- Action 3: Scroll the page ---
    this.logger(`Scrolling down by ${this.options.scrollAmount}px`);
    // Use humanScroll for realistic scrolling simulation
    await (this.page as any).humanScroll('down', this.options.scrollAmount);
    // Apply custom delay after scrolling, if configured
    if (this.options.delayBetweenActions && this.options.delayAfterScroll) {
      await this.automation.delay(this.options.delayAfterScroll);
    } else if (this.options.delayBetweenActions) {
      await this.automation.delay('short'); // Fallback to default 'short'
    }
  }

  @loggable
  async verify(_data: string): Promise<TaskResult> {
    // For this example, we'll check if the URL changed to a search results page.
    // In a real task, this would verify the success of the executed action.
    const currentUrl = this.page.url();
    if (currentUrl.includes('search?q=')) {
      return { success: true, data: { verification: 'search_results_page' } };
    } else {
      return { success: false, error: 'Not on search results page.' };
    }
  }
}
export const type = 'taskExample';

/**
 * The run function is the entry point for the task.
 * It creates an instance of TaskExample and executes its run method.
 * @param page - The Playwright Page instance.
 * @param automation - The AutomationInstance providing delay and logging utilities.
 * @param _data - The primary data for this task (e.g., a username, URL).
 * @param options - Task-specific options, merged with DEFAULT_OPTIONS.
 * @param profileId - The ID of the ixBrowser profile.
 * @param profileName - The name of the ixBrowser profile.
 * @param selectors - Global selectors configuration (not directly used by this example, but passed).
 * @returns A Promise that resolves with the TaskResult.
 */
export async function run(
  page: Page,
  automation: AutomationInstance,
  _data: string,
  options: Partial<TaskExampleOptions> = {},
  profileId: string | null = null,
  profileName: string | null = null,
  selectors: any,
): Promise<TaskResult> {
  const task = new TaskExample(page, automation, { ...DEFAULT_OPTIONS, ...options }, profileId, profileName, selectors);
  return task.run(_data);
}
