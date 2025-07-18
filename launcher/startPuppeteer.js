const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function getRunningProfiles() {
  const res = await axios.get('http://127.0.0.1:3000/api/profiles');
  return res.data?.data?.filter(p => p.status === 'running' && p.wsEndpoint);
}

async function automateProfile(profile) {
  try {
    const browser = await puppeteer.connect({ browserWSEndpoint: profile.wsEndpoint });
    const page = await browser.newPage();
    await automateWallet(page, profile.name); // 👈 Call external automation
    //await browser.disconnect();
  } catch (err) {
    console.error(`❌ Failed on ${profile.name}: ${err.message}`);
  }
}


(async () => {
  const profiles = await getRunningProfiles();
  if (profiles.length === 0) {
    console.log('⚠️ No running IXBrowser profiles found.');
    return;
  }

  await Promise.all(profiles.map(automateProfile));
})();
