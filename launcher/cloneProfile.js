// cloneProfile.js
/**
 * Profile Cloner Script
 * Purpose: Clones existing numeric-named profiles via a REST API, creating multiple copies with new numeric names
 * and fresh fingerprints. Interactively prompts the user to select a source profile and specify the number of clones.
 * Usage: Run with Node.js, requires axios and inquirer dependencies.
 * Configuration: Set BASE_URL as an environment variable (e.g., export BASE_URL=http://127.0.0.1:3000/api/profiles).
 * If not set, defaults to http://127.0.0.1:3000/api/profiles.
 */

const axios = require('axios');
const inquirer = require('inquirer');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/api/profiles';

// Fetch all profiles from the API
async function fetchProfiles() {
  try {
    const { data } = await axios.get(BASE_URL);
    if (!data || !Array.isArray(data.data)) {
      throw new Error('API response is malformed');
    }
    return data.data || [];
  } catch (error) {
    console.error('❌ Failed to fetch profiles:', error.message);
    throw error;
  }
}

// Get full profile configuration by name
async function getProfileByName(name, profiles) {
  const profile = profiles.find(p => p.name === name);
  if (!profile) throw new Error(`Profile ${name} not found`);
  try {
    const { data } = await axios.get(`${BASE_URL}/${profile.id}`);
    return data;
  } catch (error) {
    console.error(`❌ Error fetching profile ${name}:`, error.message);
    throw error;
  }
}

// Generate next available numeric names (make digits configurable)
async function getNextNames(count, profiles, digits = 4) {
  const numericProfiles = profiles.filter(p => /^\d{1,}$/.test(p.name)); // More flexible regex
  const maxNum = numericProfiles.length > 0
    ? numericProfiles.reduce((max, p) => Math.max(max, parseInt(p.name, 10)), 0)
    : 0;
  
  const newNames = Array.from({ length: count }, (_, i) =>
    String(maxNum + i + 1).padStart(digits, '0')
  );
  
  // Check for existing names
  const existingNames = profiles.map(p => p.name);
  for (const name of newNames) {
    if (existingNames.includes(name)) {
      throw new Error(`Name ${name} already exists`);
    }
  }
  
  return newNames;
}

// Prompt user for source profile and clone count
async function getUserInput(profiles) {
  const numericProfiles = profiles.filter(p => /^\d{1,}$/.test(p.name)); // Allow more flexibility
  if (!numericProfiles.length) {
    console.log('⚠️ No numeric profiles available to clone. Please check the API and try again.');
    return null;
  }

  const { sourceProfile, cloneCount, digits } = await inquirer.prompt([
    {
      type: 'list',
      name: 'sourceProfile',
      message: '🧬 Select profile to clone:',
      choices: numericProfiles.map(p => p.name)
    },
    {
      type: 'input',
      name: 'cloneCount',
      message: '📎 Number of clones:',
      validate: val => {
        const num = parseInt(val, 10);
        return isNaN(num) || num <= 0 ? 'Please enter a positive number' : true;
      }
    },
    {
      type: 'input',
      name: 'digits',
      message: '🔢 Number of digits for new profile names (default 4):',
      default: '4',
      validate: val => {
        const num = parseInt(val, 10);
        return isNaN(num) || num < 1 ? 'Please enter a positive integer' : true;
      }
    }
  ]);

  return { sourceProfile, cloneCount: parseInt(cloneCount, 10), digits: parseInt(digits, 10) };
}

// Clone profiles with new names and fresh fingerprints
async function cloneProfiles() {
  try {
    const profiles = await fetchProfiles();
    const input = await getUserInput(profiles);
    if (!input) return;

    const { sourceProfile, cloneCount, digits } = input;
    const source = await getProfileByName(sourceProfile, profiles);
    const newNames = await getNextNames(cloneCount, profiles, digits);

    const clonePromises = newNames.map(async (name) => {
      const clone = {
        ...source,
        name,
        fingerprintMode: 'new',
        autoUpdateFingerprint: true
      };
      delete clone.id;
      delete clone.fingerprint;
      delete clone.creationTime;
      delete clone.updateTime;

      try {
        await axios.post(BASE_URL, clone);
        console.log(`✅ Cloned ${sourceProfile} → ${name}`);
        return { success: true, name };
      } catch (error) {
        console.error(`❌ Failed to clone ${name}:`, error.message);
        return { success: false, name, error: error.message };
      }
    });

    const results = await Promise.all(clonePromises);
    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;
    console.log(`📝 Summary: ${successes} clones succeeded, ${failures} failed.`);
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

// Run the script
cloneProfiles();
