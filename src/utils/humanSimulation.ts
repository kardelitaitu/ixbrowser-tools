import { Page, ElementHandle } from 'playwright';

/**
 * @fileoverview Simulates human-like mouse interactions, including movement, clicking, and scrolling.
 */

interface MouseMovementOptions {
  steps?: number;
  minDelay?: number;
  maxDelay?: number;
  overshoot?: boolean;
}

/**
 * Simulates human-like mouse movement to an element.
 * @param page - The Playwright page object.
 * @param element - The target element handle.
 * @param options - Movement options.
 */
export async function simulateMouseMovement(
  page: Page,
  element: ElementHandle,
  options: MouseMovementOptions = {},
): Promise<void> {
  const {
    steps = Math.floor(Math.random() * 15) + 10, // More steps for smoother curves
    minDelay = 15,
    maxDelay = 60,
    overshoot = Math.random() < 0.3, // 30% chance to overshoot slightly
  } = options;

  try {
    const viewport = page.viewportSize();
    if (!viewport) {
      console.log('Viewport not avail, skip mouse sim');
      return;
    }

    const elementBox = await element.boundingBox();
    if (!elementBox) {
      console.log('Element not visible, skip mouse sim');
      return;
    }

    const targetX =
      elementBox.x +
      elementBox.width / 2 +
      (Math.random() - 0.5) * elementBox.width * 0.1; // Randomize target within 10% of element width
    const targetY =
      elementBox.y +
      elementBox.height / 2 +
      (Math.random() - 0.5) * elementBox.height * 0.1; // Randomize target within 10% of element height

    let startX: number, startY: number;

    // More sophisticated starting position logic
    if (viewport.width < 800 || viewport.height < 600) {
      const margin = 50;
      const safeWidth = Math.max(viewport.width - margin * 2, 100);
      const safeHeight = Math.max(viewport.height - margin * 2, 100);

      startX = margin + Math.floor(Math.random() * safeWidth);
      startY = margin + Math.floor(Math.random() * safeHeight);
    } else {
      // Start from a random edge or corner, or a more central but varied point
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0: // Top edge
          startX = Math.random() * viewport.width;
          startY = Math.random() * 50; // Within 50px of top
          break;
        case 1: // Right edge
          startX = viewport.width - Math.random() * 50;
          startY = Math.random() * viewport.height;
          break;
        case 2: // Bottom edge
          startX = Math.random() * viewport.width;
          startY = viewport.height - Math.random() * 50;
          break;
        case 3: // Left edge
          startX = Math.random() * 50;
          startY = Math.random() * viewport.height;
          break;
        default: // Central area
          startX =
            Math.floor(Math.random() * (viewport.width * 0.4)) +
            viewport.width * 0.3;
          startY =
            Math.floor(Math.random() * (viewport.height * 0.4)) +
            viewport.height * 0.3;
      }
    }

    // Ensure starting position is not too close to target
    const distance = Math.sqrt(
      Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2),
    );
    if (distance < 50) {
      // Increased minimum distance
      const angle = Math.random() * 2 * Math.PI;
      startX = targetX + Math.cos(angle) * (50 + Math.random() * 50); // 50-100px away
      startY = targetY + Math.sin(angle) * (50 + Math.random() * 50);

      startX = Math.max(10, Math.min(viewport.width - 10, startX));
      startY = Math.max(10, Math.min(viewport.height - 10, startY));
    }

    // Generate control points for a cubic Bezier curve
    const controlPoint1X =
      startX + (targetX - startX) * (0.2 + Math.random() * 0.3) + (Math.random() - 0.5) * 100;
    const controlPoint1Y =
      startY + (targetY - startY) * (0.2 + Math.random() * 0.3) + (Math.random() - 0.5) * 100;
    const controlPoint2X =
      startX + (targetX - startX) * (0.5 + Math.random() * 0.3) + (Math.random() - 0.5) * 100;
    const controlPoint2Y =
      startY + (targetY - startY) * (0.5 + Math.random() * 0.3) + (Math.random() - 0.5) * 100;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;

      // Cubic Bezier curve calculation
      const currentX =
        Math.pow(1 - t, 3) * startX +
        3 * Math.pow(1 - t, 2) * t * controlPoint1X +
        3 * (1 - t) * Math.pow(t, 2) * controlPoint2X +
        Math.pow(t, 3) * targetX;
      const currentY =
        Math.pow(1 - t, 3) * startY +
        3 * Math.pow(1 - t, 2) * t * controlPoint1Y +
        3 * (1 - t) * Math.pow(t, 2) * controlPoint2Y +
        Math.pow(t, 3) * targetY;

      // Add micro-jitters for human-like imperfection
      let jitterX = (Math.random() - 0.5) * 2; // +/- 1px
      let jitterY = (Math.random() - 0.5) * 2; // +/- 1px

      // Scale jitter based on movement speed (more jitter for slower movements)
      const speedFactor = 1 - Math.abs(0.5 - t) * 2; // Peaks in middle, low at ends
      jitterX *= 1 + speedFactor * 2; // Max +/- 3px jitter in middle
      jitterY *= 1 + speedFactor * 2;

      let finalX = currentX + jitterX;
      let finalY = currentY + jitterY;

      // Keep mouse within viewport bounds during movement
      finalX = Math.max(5, Math.min(viewport.width - 5, finalX));
      finalY = Math.max(5, Math.min(viewport.height - 5, finalY));

      await page.mouse.move(finalX, finalY);

      // Variable delay between movements
      if (i < steps) {
        const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
        await page.waitForTimeout(delay);
      }
    }

    // Optional overshoot and return
    if (overshoot) {
      const overshootX = targetX + (Math.random() - 0.5) * 20;
      const overshootY = targetY + (Math.random() - 0.5) * 20;
      await page.mouse.move(overshootX, overshootY, { steps: 5 });
      await page.waitForTimeout(Math.floor(Math.random() * 100) + 50);
      await page.mouse.move(targetX, targetY, { steps: 3 });
      await page.waitForTimeout(Math.floor(Math.random() * 50) + 20);
    }

    // Brief pause before click (human hesitation)
    const hesitationDelay = Math.floor(Math.random() * 150) + 50; // 50-200ms
    await page.waitForTimeout(hesitationDelay);
  } catch (error) {
    console.log('Mouse move sim failed:', (error as Error).message);
    // Continue with click even if movement fails
  }
}

/**
 * Generates a random delay with human-like timing variations.
 * @param min - The minimum delay in milliseconds.
 * @param max - The maximum delay in milliseconds.
 * @returns A promise that resolves after the random delay.
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`⏱️ Wait ${delay}ms...`);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Adds a `humanClick` method to the Playwright Page object.
 * @param page - The Playwright page instance.
 */
export function addHumanClickToPage(page: Page): void {
  (page as any).humanClick = async function(selector: string): Promise<void> {
    try {
      // Wait for element to be visible and interactable
      await page.waitForSelector(selector, {
        timeout: 10000,
        state: 'visible',
      });

      // Get the element handle
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      // Always simulate realistic mouse movement with optimal settings
      await simulateMouseMovement(page, element, {
        steps: Math.floor(Math.random() * 6) + 6, // Random 6-11 steps
        minDelay: 25,
        maxDelay: 75,
      });

      // Perform the actual click
      await element.click();

      // Add a randomized post-click delay to simulate human reaction time
      const postClickDelay = Math.floor(Math.random() * 200) + 100; // 100-300ms
      await page.waitForTimeout(postClickDelay);

      console.log(`✅ Human click on: ${selector}`);
    } catch (error) {
      console.log(`❌ humanClick failed on ${selector}:`, error.message);
      throw error;
    }
  };
}

/**
 * Adds a `humanScroll` method to the Playwright Page object.
 * @param page - The Playwright page instance.
 */
export function addHumanScrollToPage(page: Page): void {
  (page as any).humanScroll = async function(
    direction: 'up' | 'down',
    amount: number,
  ): Promise<void> {
    try {
      const scrollDistance = direction === 'down' ? amount : -amount;
      // Simulate multiple smaller scroll events with variable delays
      const totalScroll = Math.abs(scrollDistance);
      let scrolled = 0;
      while (scrolled < totalScroll) {
        const scrollAmount = Math.min(
          Math.floor(Math.random() * 100) + 50,
          totalScroll - scrolled,
        ); // Scroll 50-150px at a time
        await page.mouse.wheel(0, direction === 'down' ? scrollAmount : -scrollAmount);
        scrolled += scrollAmount;
        const delay = Math.floor(Math.random() * 150) + 50; // 50-200ms delay between scroll bursts
        await page.waitForTimeout(delay);
      }
      console.log(`✅ Human scroll: ${direction} by ${amount}`);
    } catch (error) {
      console.log('Scroll failed:', (error as Error).message);
    }
  };
}

interface HumanScrollOptions {
  delay?: (_profile: 'short' | 'medium' | 'long') => Promise<void>;
}

/**
 * Standalone humanScroll function for direct use.
 * @param page - The Playwright page instance.
 * @param direction - The scroll direction ('down' or 'up').
 * @param amount - The scroll amount in pixels.
 * @param options - Scroll options.
 */
export async function humanScroll(
  page: Page,
  direction: 'down' | 'up' = 'down',
  amount = 300,
  options: HumanScrollOptions = {},
): Promise<void> {
  const { delay } = options;

  try {
    const scrollDistance = direction === 'down' ? amount : -amount;
    // Simulate multiple smaller scroll events with variable delays
    const totalScroll = Math.abs(scrollDistance);
    let scrolled = 0;
    while (scrolled < totalScroll) {
      const scrollAmount = Math.min(
        Math.floor(Math.random() * 100) + 50,
        totalScroll - scrolled,
      ); // Scroll 50-150px at a time
      await page.mouse.wheel(0, direction === 'down' ? scrollAmount : -scrollAmount);
      scrolled += scrollAmount;
      const delayTime = Math.floor(Math.random() * 150) + 50; // 50-200ms delay between scroll bursts
      await page.waitForTimeout(delayTime);
    }
    if (delay && typeof delay === 'function') {
      await delay('short');
    } else {
      const waitTime = Math.random() * 300 + 100;
      await page.waitForTimeout(waitTime);
    }
  } catch (error) {
    console.log('Scroll failed:', (error as Error).message);
  }
}
