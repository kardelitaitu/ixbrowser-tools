"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrollIntoViewIfNeeded = scrollIntoViewIfNeeded;
/**
 * Scrolls an element into view if needed, with human-like delays.
 * @param page - The Playwright page object.
 * @param selector - The CSS selector for the element.
 * @param options - Options for scrolling behavior.
 * @returns A promise that resolves when the element is scrolled into view.
 */
async function scrollIntoViewIfNeeded(page, selector, options = {}) {
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
        }
        else {
            // Default delay
            await page.waitForTimeout(Math.random() * 200 + 100);
        }
    }
    catch (error) {
        const errorMessage = `Scroll into view failed for "${selector}": ${error.message}`;
        console.error(errorMessage);
        if (throwOnError) {
            throw new Error(errorMessage);
        }
        // Don't throw by default - scrolling is not always critical for operation
    }
}
