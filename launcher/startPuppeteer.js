const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const automateWallet = require('./walletImport'); // 🔁 Modular automation logic

puppeteer.use(StealthPlugin());

// 🔍 Query all running profiles with valid WebSocket endpoint
async function getRunningProfiles() {
  try {
    const res = await axios.get('http://127.0.0.1:3000/api/profiles');
    const allProfiles = res.data?.data || [];

    const running = allProfiles.filter(p => p.status === 'running' && p.wsEndpoint);
    console.log(`🔎 Found ${running.length} running IXBrowser profiles`);
    return running;
  } catch (err) {
    console.error(`❌ Failed to query profiles: ${err.message}`);
    return [];
  }
}

// 🧠 Automate a single profile using external module
async function automateProfile(profile) {
  try {
    const browser = await puppeteer.connect({ browserWSEndpoint: profile.wsEndpoint });
    const page = await browser.newPage();

    await automateWallet(page, profile.name); // 🔁 External automation logic
    //await browser.disconnect();
  } catch (err) {
    console.error(`❌ Failed on ${profile.name}: ${err.message}`);
  }
}

// 🚀 Main sequence: attach to every running profile
(async () => {
  const profiles = await getRunningProfiles();
  if (profiles.length === 0) {
    console.log('⚠️ No running IXBrowser profiles found.');
    return;
  }

  await Promise.all(profiles.map(automateProfile));
})();
