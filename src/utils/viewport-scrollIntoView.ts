import { Page } from 'playwright';

/**
 * @fileoverview Scrolls an element into view if it's not already, with human-like delays.
 */

interface ScrollOptions {
  block?: 'start' | 'center' | 'end' | 'nearest';
  delay?: (profile: 'short' | 'medium' | 'long') => Promise<void>;
  throwOnError?: boolean;
}

/**
 * Scrolls an element into view if needed, with human-like delays.
 * @param page - The Playwright page object.
 * @param selector - The CSS selector for the element.
 * @param options - Options for scrolling behavior.
 * @returns A promise that resolves when the element is scrolled into view.
 */
export async function scrollIntoViewIfNeeded(
  page: Page,
  selector: string,
  options: ScrollOptions = {}
): Promise<void> {
  const { block = 'center', delay, throwOnError = false } = options;

  try {
    // Check if element exists and is visible
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    // Scroll into view using Playwright's method
    await element.evaluate((node, { block }) => node.scrollIntoView({ block }), { block });

    // Add human-like delay
    if (delay && typeof delay === 'function') {
      await delay('short');
    } else {
      // Default delay
      await page.waitForTimeout(Math.random() * 200 + 100);
    }
  } catch (error) {
    const errorMessage = `Scroll into view failed for "${selector}": ${(error as Error).message}`;
    console.error(errorMessage);
    if (throwOnError) {
      throw new Error(errorMessage);
    }
    // Don't throw by default - scrolling is not always critical for operation
  }
}

