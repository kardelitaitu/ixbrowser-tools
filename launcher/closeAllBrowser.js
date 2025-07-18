const axios = require('axios');

async function getRunningProfiles() {
  try {
    const res = await axios.get('http://127.0.0.1:3000/api/profiles');
    const allProfiles = res.data?.data || [];
    const running = allProfiles.filter(p => p.status === 'running' && p.id);
    console.log(`🔎 Found ${running.length} running IXBrowser profiles`);
    return running;
  } catch (err) {
    console.error(`❌ Failed to query profiles: ${err.message}`);
    return [];
  }
}

async function closeProfile(profileId, profileName) {
  try {
    await axios.post('http://127.0.0.1:3000/api/stop-profile', { profileId });
    console.log(`🛑 Closed ${profileName}`);
  } catch (err) {
    console.error(`❌ Error closing ${profileName}: ${err.message}`);
  }
}

(async () => {
  const profiles = await getRunningProfiles();
  if (profiles.length === 0) {
    console.log('⚠️ No running IXBrowser profiles to close.');
    return;
  }

  let index = 0;
  function closeNext() {
    if (index >= profiles.length) return;
    const { id, name } = profiles[index];
    closeProfile(id, name);
    index++;
    setTimeout(closeNext, 2000); // ⏱️ Delay between closures
  }

  closeNext();
})();
