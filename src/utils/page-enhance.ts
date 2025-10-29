import { Page } from 'playwright';
import { addHumanClickToPage, addHumanScrollToPage } from './humanSimulation';
import { humanType } from './type-human';
import { scrollIntoViewIfNeeded } from './viewport-scrollIntoView';

/**
 * @fileoverview Enhances a Playwright Page object with human-like interaction methods.
 */

interface EnhancePageOptions {
  delay?: (_profile?: 'short' | 'medium' | 'long') => Promise<void>;
  logger?: (_msg: string) => void;
  typeVariation?: boolean;
}

/**
 * Enhances a Playwright Page object with human-like methods using shared utilities.
 * - Adds `page.humanClick` via `addHumanClickToPage()` and wraps it to auto-scroll before clicking.
 * - Adds `page.humanType` and `page.humanScroll` wrappers with injected delays and options.
 * @param page - The Playwright page object.
 * @param options - Enhancement options.
 * @returns The enhanced Playwright Page object.
 */
export function enhancePage(
  page: Page,
  options: EnhancePageOptions = {},
): Page {
  const { delay, logger = () => {}, typeVariation = true } = options;

  // Adds base humanClick(selector)
  addHumanClickToPage(page);
  // Adds base humanScroll(direction, amount)
  addHumanScrollToPage(page);

  // Wrap humanClick to ensure the target is scrolled into view before moving/clicking
  const baseHumanClick = (page as any).humanClick;
  (page as any).humanClick = async(selector: string) => {
    try {
      await scrollIntoViewIfNeeded(page, selector, { block: 'center', delay });
    } catch (e) {
      logger(
        `scrollIntoViewIfNeeded warning for ${selector}: ${e && (e as Error).message ? (e as Error).message : e}`,
      );
    }
    return baseHumanClick(selector);
  };

  // Add wrappers wired to injected helpers (so they use the configured delays)
  (page as any).humanType = async(
    selector: string,
    text: string,
    typeOptions: any,
  ) =>
    humanType(page, selector, text, { ...typeOptions, typeVariation, delay });

  // page.humanScroll is already enhanced by addHumanScrollToPage, no need for a wrapper here unless specific options are needed

  return page;
}
