import { Page, Locator } from 'playwright';
import { ElementNotFoundError } from './errors';

/**
 * Intelligently finds elements using multiple selector strategies
 * @param {Page} page - Playwright page instance
 * @param {string[]} selectors - Array of CSS selectors to try
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<{ element: Locator, selectorUsed: string }>}
 */
export async function findElementSmart(page: Page, selectors: string[], timeout = 5000): Promise<{ element: Locator, selectorUsed: string }> {
  if (!Array.isArray(selectors) || selectors.length === 0) {
    throw new ElementNotFoundError('Selectors must be a non-empty array', selectors.join(', '), page.url());
  }

  const startTime = Date.now();

  // Try each selector in order
  for (const selector of selectors) {
    try {
      // Try to find element with this selector
      const elements = await page.locator(selector).all();

      if (elements.length > 0) {
        // Found element(s), check if visible
        for (const element of elements) {
          try {
            const isVisible = await element.isVisible();
            if (isVisible) {
              return { element, selectorUsed: selector };
            }
          } catch (e) {
            // Continue to next element
          }
        }
      }
    } catch (error) {
      // Continue to next selector
    }

    // Check if timeout exceeded
    if (Date.now() - startTime > timeout) {
      throw new ElementNotFoundError(
        `Element not found within ${timeout}ms using selectors: ${selectors.join(', ')}`,
        selectors.join(', '),
        page.url(),
      );
    }
  }

  // If we get here, no selector worked
  throw new ElementNotFoundError(
    `No visible elements found using selectors: ${selectors.join(', ')}`,
    selectors.join(', '),
    page.url(),
  );
}
