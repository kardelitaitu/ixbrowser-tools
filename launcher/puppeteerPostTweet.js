/*
  puppeteerPostTweet.js
  How to use in main.js:
  await postTweet(page, profileName);
*/

/**
 * Posts a randomized tweet using X.com's web intent flow.
 * Requires tweets.txt in the same directory with one tweet per line.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {string} profileName - Label used for logging/debugging profile identity
 */

const fs = require('fs');
const path = require('path');

module.exports = async function postTweet(page, profileName) {
  try {
    console.log(`🧠 Preparing to post tweet for profile: ${profileName}`);

    const tweetFilePath = path.resolve(__dirname, 'tweets.txt');
    if (!fs.existsSync(tweetFilePath)) {
      throw new Error('tweets.txt not found!');
    }

    const allTweets = fs.readFileSync(tweetFilePath, 'utf-8')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    if (allTweets.length === 0) {
      throw new Error('tweets.txt is empty.');
    }

    const randomTweet = allTweets[Math.floor(Math.random() * allTweets.length)];
    const tweetIntentUrl = `https://x.com/intent/post?text=${encodeURIComponent(randomTweet)}`;

    await page.goto(tweetIntentUrl, { waitUntil: 'domcontentloaded' });

    try {
      await page.waitForFunction(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        return spans.some(el => el.textContent.trim() === 'Post');
      }, { timeout: 10000 });

      await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const postButton = spans.find(el => el.textContent.trim() === 'Post');
        if (postButton) postButton.click();
      });

      console.log(`✅ Tweet posted for ${profileName}: "${randomTweet}"`);
    } catch (clickErr) {
      console.warn(`⚠️ Could not find or click "Post" button for ${profileName}:`, clickErr.message);
    }
  } catch (err) {
    console.error(`🚫 Failed to post tweet for ${profileName}:`, err.message);
  }
};

const fs = require('fs');
const path = require('path');

module.exports = async function postTweet(page, profileName) {
  try {
    console.log(`🧠 Preparing to post tweet for profile: ${profileName}`);

    const tweetFilePath = path.resolve(__dirname, 'tweets.txt');
    if (!fs.existsSync(tweetFilePath)) {
      throw new Error('tweets.txt not found!');
    }

    const allTweets = fs.readFileSync(tweetFilePath, 'utf-8')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    if (allTweets.length === 0) {
      throw new Error('tweets.txt is empty.');
    }

    const randomTweet = allTweets[Math.floor(Math.random() * allTweets.length)];
    const tweetIntentUrl = `https://x.com/intent/post?text=${encodeURIComponent(randomTweet)}`;

    await page.goto(tweetIntentUrl, { waitUntil: 'domcontentloaded' });

    try {
      await page.waitForFunction(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        return spans.some(el => el.textContent.trim() === 'Post');
      }, { timeout: 10000 });

      await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const postButton = spans.find(el => el.textContent.trim() === 'Post');
        if (postButton) postButton.click();
      });

      console.log(`✅ Tweet posted for ${profileName}: "${randomTweet}"`);
    } catch (clickErr) {
      console.warn(`⚠️ Could not find 'Post' button for ${profileName}:`, clickErr.message);
    }
  } catch (err) {
    console.error(`🚫 Failed to post tweet for ${profileName}:`, err.message);
  }
};
