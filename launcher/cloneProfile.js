/**
 * Profile Cloner Script
 * Purpose: Clones existing numeric-named profiles via a REST API, creating multiple copies with new numeric names
 * and fresh fingerprints. Interactively prompts the user to select a source profile and specify the number of clones.
 * Usage: Run with Node.js, requires axios and inquirer dependencies, and a running API at http://127.0.0.1:3000/api/profiles.
 */

const axios = require('axios');
const inquirer = require('inquirer');
const BASE_URL = 'http://127.0.0.1:3000/api/profiles';

// Fetch all profiles from the API
async function fetchProfiles() {
  try {
    const { data } = await axios.get(BASE_URL);
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
  const { data } = await axios.get(`${BASE_URL}/${profile.id}`);
  return data;
}

// Generate next available numeric names (4 digits)
async function getNextNames(count, profiles) {
  const maxNum = profiles
    .filter(p => /^\d{4}$/.test(p.name))
    .reduce((max, p) => Math.max(max, parseInt(p.name, 10)), 0);
  return Array.from({ length: count }, (_, i) =>
    String(maxNum + i + 1).padStart(4, '0')
  );
}

// Prompt user for source profile and clone count
async function getUserInput(profiles) {
  const numericProfiles = profiles.filter(p => /^\d{4}$/.test(p.name));
  if (!numericProfiles.length) {
    console.log('⚠️ No numeric profiles available to clone.');
    return null;
  }

  const { sourceProfile, cloneCount } = await inquirer.prompt([
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
        return isNaN(num) || num <= 0 ? 'Enter a positive number' : true;
      }
    }
  ]);

  return { sourceProfile, cloneCount: parseInt(cloneCount, 10) };
}

// Clone profiles with new names and fresh fingerprints
async function cloneProfiles() {
  const profiles = await fetchProfiles();
  const input = await getUserInput(profiles);
  if (!input) return;

  const { sourceProfile, cloneCount } = input;
  const source = await getProfileByName(sourceProfile, profiles);
  const newNames = await getNextNames(cloneCount, profiles);

  for (const name of newNames) {
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
    } catch (error) {
      console.error(`❌ Failed to clone ${name}:`, error.message);
    }
  }
}

// Run the script
cloneProfiles().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});
