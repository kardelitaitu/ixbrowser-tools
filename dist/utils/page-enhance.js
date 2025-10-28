"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancePage = enhancePage;
const humanSimulation_1 = require("./humanSimulation");
const type_human_1 = require("./type-human");
const viewport_scrollIntoView_1 = require("./viewport-scrollIntoView");
/**
 * Enhances a Playwright Page object with human-like methods using shared utilities.
 * - Adds `page.humanClick` via `addHumanClickToPage()` and wraps it to auto-scroll before clicking.
 * - Adds `page.humanType` and `page.humanScroll` wrappers with injected delays and options.
 * @param page - The Playwright page object.
 * @param options - Enhancement options.
 * @returns The enhanced Playwright Page object.
 */
function enhancePage(page, options = {}) {
    const { delay, logger = () => { }, typeVariation = true } = options;
    // Adds base humanClick(selector)
    (0, humanSimulation_1.addHumanClickToPage)(page);
    // Adds base humanScroll(direction, amount)
    (0, humanSimulation_1.addHumanScrollToPage)(page);
    // Wrap humanClick to ensure the target is scrolled into view before moving/clicking
    const baseHumanClick = page.humanClick;
    page.humanClick = async (selector) => {
        try {
            await (0, viewport_scrollIntoView_1.scrollIntoViewIfNeeded)(page, selector, { block: 'center', delay });
        }
        catch (e) {
            logger(`scrollIntoViewIfNeeded warning for ${selector}: ${e && e.message ? e.message : e}`);
        }
        return baseHumanClick(selector);
    };
    // Add wrappers wired to injected helpers (so they use the configured delays)
    page.humanType = async (selector, text, typeOptions) => (0, type_human_1.humanType)(page, selector, text, { ...typeOptions, typeVariation, delay });
    // page.humanScroll is already enhanced by addHumanScrollToPage, no need for a wrapper here unless specific options are needed
    return page;
}
