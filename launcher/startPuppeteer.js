/**
 * 📌 Script: startPuppeteer.js
 * 🔧 Params:
 *    - IXBrowser must be running with active profiles.
 *    - External modules required: automateWallet.js
 * 🧪 Usage:
 *    1. Start IXBrowser and ensure profiles are running.
 *    2. Launch this script: `node startPuppeteer.js`
 *    3. Script will auto-connect to running profiles and apply automation.
 */
const [puppeteer, StealthPlugin, axios, fs, path] = [require('puppeteer-extra'), require('puppeteer-extra-plugin-stealth'), require('axios'), require('fs'), require('path')]; puppeteer.use(StealthPlugin());
// 📦 Dynamically load all .js modules (excluding this file)
function loadAutomationModules() {
  const currentFile = path.basename(__filename);
  const files = fs.readdirSync(__dirname);
  return files
    .filter(file => file.endsWith('.js') && file !== currentFile)
    .map(file => {
      const modulePath = path.join(__dirname, file);
      return require(modulePath);
    });
}
const automationModules = loadAutomationModules(); // 🧠 Grab all logic modules
// 🔍 Fetch all running profiles with valid WebSocket endpoints
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
// 🧠 Run automation logic on a single profile
async function automateProfile(profile) {
  try {
    const browser = await puppeteer.connect({ browserWSEndpoint: profile.wsEndpoint });
    const page = await browser.newPage();

    await automateWallet(page, profile.name);
    // Optionally disconnect if no more automation is needed
    // await browser.disconnect();
  } catch (err) {
    throw new Error(`Failed on ${profile.name}: ${err.message}`);
  }
}
// 🚀 Attach to all profiles and automate
(async () => {
  const profiles = await getRunningProfiles();
  if (profiles.length === 0) {
    console.log('⚠️ No running IXBrowser profiles found.');
    return;
  }
  const results = await Promise.allSettled(profiles.map(automateProfile));
  results.forEach((result, index) => {
    const name = profiles[index].name;
    if (result.status === 'fulfilled') {
      console.log(`✅ ${name} automation completed`);
    } else {
      console.error(`⚠️ ${name} automation failed: ${result.reason.message}`);
    }
  });
})();
