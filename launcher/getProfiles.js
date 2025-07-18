const fs = require('fs');
const path = require('path');
const axios = require('axios');

const apiURL = 'http://127.0.0.1:3000/api/profiles'; // Update port if needed
const outputPath = path.join(__dirname, '!profiles.txt');

(async () => {
  try {
    const response = await axios.get(apiURL);
    const profiles = response.data?.data;

    if (!Array.isArray(profiles) || profiles.length === 0) {
      throw new Error('No profiles found in API response');
    }

    const lines = profiles.map((profile, index) => {
      const logicalName = `Profile${String(index + 1).padStart(3, '0')}`;
      return `${logicalName},${profile.id}`;
    });

    fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
    console.log(`✅ Saved ${lines.length} profiles to ${outputPath}`);
  } catch (err) {
    console.error(`❌ Failed to fetch or save profiles: ${err.message}`);
  }
})();
