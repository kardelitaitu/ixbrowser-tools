"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.humanType = humanType;
/**
 * Types text with human-like speed and variation.
 * @param page - The Playwright page object.
 * @param selector - The CSS selector for the input element.
 * @param text - The text to type.
 * @param options - Options for typing behavior.
 * @returns A promise that resolves when typing is complete.
 */
async function humanType(page, selector, text, options = {}) {
    const { typeVariation = true, delay, typoProbability = 0.05, minKeyPress = 30, maxKeyPress = 80, } = options;
    try {
        // Wait for element to be visible
        await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
        // Focus on the element
        await page.click(selector);
        if (typeVariation) {
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                // Simulate typos
                if (Math.random() < typoProbability && i < text.length - 1) {
                    const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // a-z
                    await page.keyboard.down(randomChar);
                    await page.waitForTimeout(Math.random() * (maxKeyPress - minKeyPress) + minKeyPress);
                    await page.keyboard.up(randomChar);
                    await page.waitForTimeout(Math.random() * 50 + 20); // Delay after typo
                    await page.keyboard.press('Backspace');
                    await page.waitForTimeout(Math.random() * 50 + 20); // Delay after backspace
                }
                // Simulate variable key press and release
                await page.keyboard.down(char);
                await page.waitForTimeout(Math.random() * (maxKeyPress - minKeyPress) + minKeyPress);
                await page.keyboard.up(char);
                // Random delay between keystrokes: 50-150ms
                const charDelay = Math.random() * 100 + 50;
                await page.waitForTimeout(charDelay);
            }
        }
        else {
            // Type all at once
            await page.keyboard.type(text);
        }
        // Add delay after typing if provided
        if (delay && typeof delay === 'function') {
            await delay('short');
        }
    }
    catch (error) {
        console.error(`Human type failed for "${selector}": ${error.message}`);
        throw error;
    }
}
