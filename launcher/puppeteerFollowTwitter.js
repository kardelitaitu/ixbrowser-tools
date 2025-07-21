/*
puppeteerFollowX.js
How to use in main.js:

await followTwitter(page, profileName, 'elonmusk');

Automates follow intent for a given X.com username.
@param {import('puppeteer').Page} page - Puppeteer page instance
@param {string} profileName - Label for active profile
@param {string} usernameToFollow - X.com handle to follow
*/

module.exports = async function followTwitter(page, profileName, usernameToFollow) {
  try {
    console.log(`🧠 Starting follow intent for ${profileName} → @${usernameToFollow}`);

    const followIntentUrl = `https://x.com/intent/follow?screen_name=${encodeURIComponent(usernameToFollow)}`;
    await page.goto(followIntentUrl, { waitUntil: 'domcontentloaded' });

    try {
      await page.waitForFunction(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        return spans.some(el => el.textContent.trim() === 'Follow');
      }, { timeout: 10000 });

      await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const followButton = spans.find(el => el.textContent.trim() === 'Follow');
        if (followButton) followButton.click();
      });

      console.log(`✅ Followed @${usernameToFollow} with ${profileName}`);
    } catch (clickErr) {
      console.warn(`⚠️ Couldn't find or click "Follow" button for ${profileName}:`, clickErr.message);
    }
  } catch (err) {
    console.error(`🚫 Follow failed for ${profileName}:`, err.message);
  }
};
