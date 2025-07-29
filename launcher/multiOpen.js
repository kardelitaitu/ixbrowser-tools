//npm install axios
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 🔧 Configurable delays
const instanceDelay = 3000; // Delay between profile launches (ms)
const urlDelay = 3000;      // Delay between URLs (ms)
const apiUrl = 'http://127.0.0.1:3000/api/open-url'; // Adjust if needed

// 🧩 Logical profile names to launch (paste-friendly multiline)
const rawProfiles = `
Profile001
Profile003
Profile005
Profile007
`;

const profilePairs = rawProfiles
  .split('\n')
  .map(p => p.trim())
  .filter(Boolean)
  .map(p => [p]);

// 📥 Load profile map from !profiles.txt
function loadProfileMap(filePath) {
  const map = {};
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    raw.split('\n').forEach(line => {
      const [name, id] = line.trim().split(',');
      if (name && id) map[name.trim()] = id.trim();
    });
  } catch (err) {
    console.error(`❌ Error reading !profiles.txt: ${err.message}`);
    process.exit(1);
  }
  return map;
}

const profileMap = loadProfileMap(path.join(__dirname, '!profiles.txt'));

// 🧠 Validate profilePairs against map
profilePairs.forEach(([name]) => {
  if (!profileMap[name]) {
    console.warn(`⚠️ Profile "${name}" not found in map`);
  }
});


// 🌐 Load URLs from !url.txt
function loadUrls(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const urls = raw
      .split('\n')
      .map(line => line.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));
    if (urls.length === 0) throw new Error('No valid URLs found in !url.txt');
    return urls;
  } catch (err) {
    console.error(`❌ Error reading !url.txt: ${err.message}`);
    process.exit(1);
  }
}

// 🚀 Open URLs for a single profile
function openUrlsForProfile(profileId, urls) {
  let index = 0;
  function openNext() {
    if (index >= urls.length) return;
    const url = urls[index];
    axios.post(apiUrl, { profileId, url })
      .then(() => {
        console.log(`✅ ${profileId} opened: ${url}`);
        index++;
        setTimeout(openNext, urlDelay);
      })
      .catch(err => {
        console.error(`⚠️ ${profileId} error on ${url}: ${err.message}`);
        index++;
        setTimeout(openNext, urlDelay);
      });
  }
  openNext();
}

// 🧭 Launch sequence
const profileMap = loadProfileMap(path.join(__dirname, '!profiles.txt'));
const urls = loadUrls(path.join(__dirname, '!url.txt'));

let profileIndex = 0;
function launchNextProfile() {
  if (profileIndex >= profilePairs.length) return;

  const logicalName = profilePairs[profileIndex][0];
  const profileId = profileMap[logicalName];

  if (!profileId) {
    console.error(`❌ Profile ID not found for "${logicalName}"`);
  } else {
    console.log(`🚀 Launching ${logicalName} [${profileId}]...`);
    openUrlsForProfile(profileId, urls);
  }

  profileIndex++;
  setTimeout(launchNextProfile, instanceDelay);
}

launchNextProfile();
