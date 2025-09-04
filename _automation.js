 /** _automation.js
 * Runs the automation logic on the Example Domain website.
 *
 * @param {import('playwright').Browser} browser - The Playwright browser instance.
 * @param {import('playwright').BrowserContext} context - The Playwright browser context.
 * @param {import('playwright').Page} page - The Playwright page instance.
 * @param {object} profileData - Any additional data related to the profile being automated.
 * @returns {Promise<{ success: boolean; data?: any; error?: string }>} - The result of the automation.
 */

async function run(browser, context, page, profileData) {
    try {
        // --------- Area to edit
        await page.goto('https://example.com', { waitUntil: 'networkidle0' });
        const title = await page.title();
        console.log('Page title:', title);
        const pageContent = await page.evaluate(() => document.body.innerText);
        console.log('Page content:', pageContent);
        const moreInfoLink = await page.$('"More information..."');
        if (moreInfoLink) {
            await moreInfoLink.click();
            console.log('Clicked "More information..." link');
        }
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        const newPageContent = await page.evaluate(() => document.body.innerText);
        console.log('New page content:', newPageContent);

        // --------- End of Area to edit
        return {
            success: true,
            data: {
                title,
                pageContent,
                newPageContent
            }
        };
    } catch (error) {
        console.error('Error during automation:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = { run };
