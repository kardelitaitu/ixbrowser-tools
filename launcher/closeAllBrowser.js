// closeAllBrowser.js
/**
 * Profile Closer Script
 * Purpose: Fetches and closes all running IXBrowser profiles via a REST API. This script queries the API for profiles 
 * with a 'running' status, then sends requests to stop each one sequentially with a specified delay to avoid overwhelming 
 * the server.
 * 
 * Usage: Run with Node.js (e.g., node closeAllBrowser.js). Requires the 'axios' dependency. Install dependencies via 
 * npm install axios. The script will automatically check for running profiles and close them.
 * 
 * Configuration: 
 * - Set BASE_URL as an environment variable for the API endpoint (e.g., export BASE_URL=http://127.0.0.1:3000/api/profiles).
 *   If not set, it defaults to 'http://127.0.0.1:3000/api/profiles'.
 * - Set CLOSURE_DELAY as an environment variable for the delay in milliseconds between closing profiles (e.g., export CLOSURE_DELAY=2000).
 *   If not set, it defaults to 2000ms (2 seconds).
 * 
 * Dependencies: 
 * - axios: For making HTTP requests.
 * 
 * Example: 
 * Ensure your API is running and accessible before executing the script.
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/api/profiles';
const DEFAULT_DELAY = parseInt(process.env.CLOSURE_DELAY, 10) || 2000; // Default to 2000ms if not set

// Fetch running profiles from the API
async function getRunningProfiles() {
  try {
    const res = await axios.get(BASE_URL);
    const allProfiles = res.data?.data || [];  // Assuming the API response has a 'data' array
    if (!Array.isArray(allProfiles)) {
      throw new Error('API response is malformed; expected an array of profiles');
    }
    const runningProfiles = allProfiles.filter(p => p.status === 'running' && p.id);
    console.log(`🔎 Found ${runningProfiles.length} running IXBrowser profiles`);
    return runningProfiles;
  } catch (err) {
    console.error(`❌ Failed to query profiles: ${err.message}`);
    return [];  // Return an empty array to allow the script to continue gracefully
  }
}

// Close a single profile by ID
async function closeProfile(profileId, profileName) {
  try {
    await axios.post(`${BASE_URL}/stop-profile`, { profileId });  // Assuming the endpoint is relative to BASE_URL
    console.log(`🛑 Successfully closed ${profileName}`);
  } catch (err) {
    console.error(`❌ Error closing ${profileName}: ${err.message}`);
    // You could add more detailed error handling here, e.g., retry logic
  }
}

// Main function to orchestrate closing profiles
async function main() {
  const profiles = await getRunningProfiles();
  
  if (profiles.length === 0) {
    console.log('⚠️ No running IXBrowser profiles to close.');
    return;  // Exit gracefully
  }
  
  let index = 0;
  const results = [];  // Array to track successes and failures
  
  async function closeNext() {
    if (index >= profiles.length) {
      // Provide a summary after all closures
      const successes = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success).length;
      console.log(`📝 Summary: ${successes} profiles closed successfully, ${failures} failed.`);
      return;
    }
    
    const { id, name } = profiles[index];
    try {
      await closeProfile(id, name);
      results.push({ success: true, name });
    } catch (err) {
      results.push({ success: false, name, error: err.message });
    }
    
    index++;
    setTimeout(closeNext, DEFAULT_DELAY);  // Delay before the next closure
  }
  
  closeNext();  // Start the process
}

// Run the main function
main().catch(error => {
  console.error('❌ Script encountered an unhandled error:', error.message);
  process.exit(1);  // Exit with error code
});
