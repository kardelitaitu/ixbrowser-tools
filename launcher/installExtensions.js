/**
 * Script: install_extensions.js
 * Purpose: This script automates the installation of multiple Chrome extensions (.crx files)
 * to all existing ixBrowser profiles using the ixBrowser Local API.
 * It's designed for scenarios where you need to provision many profiles
 * with a standard set of extensions (e.g., Web3 wallets, ad blockers)
 * without using ixBrowser's global extension feature.
 *
 * Requirements:
 * - Node.js installed.
 * - 'axios' and 'form-data' npm packages installed (`npm install axios form-data`).
 * - ixBrowser desktop application must be running.
 * - ixBrowser Local API must be enabled in ixBrowser settings.
 * - All required extension files (in .crx format) must be placed in the
 * 'extensions_crx' directory relative to this script.
 *
 * Parameters (Configuration Section):
 * - IXBROWSER_API_BASE_URL: The URL of the ixBrowser Local API.
 * Default: 'http://127.0.0.1:50055/api/v1'
 * - EXTENSIONS_DIR: The relative path to the directory containing your .crx files.
 * Default: './extensions_crx'
 * - EXTENSION_FILENAMES: An array of strings, where each string is the exact filename
 * (including .crx extension) of an extension to be installed.
 *
 * Usage:
 * 1. Place this script in your desired project directory.
 * 2. Create a subfolder named 'extensions_crx' in the same directory.
 * 3. Download or pack your desired Chrome extensions into .crx files and place
 * them inside the 'extensions_crx' folder.
 * 4. Update the `EXTENSION_FILENAMES` array below with the exact filenames
 * of your .crx files.
 * 5. Open your terminal or command prompt in the script's directory.
 * 6. Run the script: `node install_ixbrowser_extensions.js`
 *
 * The script will output detailed logs for each installation attempt (success/failure)
 * for every extension on every profile.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// --- Configuration ---
const IXBROWSER_API_BASE_URL = 'http://127.0.0.1:50055/api/v1'; // Default ixBrowser API URL

// Directory where all your .crx extension files are stored
const EXTENSIONS_DIR = path.join(__dirname, 'extensions_crx');

// List of all .crx extension filenames you want to install
// Ensure these filenames exactly match the .crx files in the EXTENSIONS_DIR
const EXTENSION_FILENAMES = [
    'metamask.crx',
    'wallet_ext_2.crx',
    'vpn_extension.crx',
    'adblocker.crx',
    // ... add all 13 of your extension filenames here, e.g.:
    // 'extension_5.crx',
    // 'extension_6.crx',
    // 'extension_7.crx',
    // 'extension_8.crx',
    // 'extension_9.crx',
    // 'extension_10.crx',
    // 'extension_11.crx',
    // 'extension_12.crx',
    'extension_13.crx'
];

// --- Main Function ---
async function installMultipleExtensionsToExistingProfiles() {
    console.log(`Starting process to install multiple extensions to existing profiles...`);

    // 1. Validate all extension files exist
    const missingExtensions = [];
    const extensionFullPaths = EXTENSION_FILENAMES.map(filename => {
        const fullPath = path.join(EXTENSIONS_DIR, filename);
        if (!fs.existsSync(fullPath)) {
            missingExtensions.push(fullPath);
        }
        return fullPath;
    });

    if (missingExtensions.length > 0) {
        console.error(`Error: The following CRX files were not found. Please ensure they are in '${EXTENSIONS_DIR}':`);
        missingExtensions.forEach(missingPath => console.error(`- ${missingPath}`));
        return;
    }
    console.log(`All ${EXTENSION_FILENAMES.length} extension CRX files found.`);

    try {
        // 2. Get List of All Profiles
        console.log('Fetching list of existing profiles...');
        const listResponse = await axios.get(`${IXBROWSER_API_BASE_URL}/profiles/list`);

        if (listResponse.data.code !== 0) {
            throw new Error(`Failed to fetch profiles: ${listResponse.data.message}`);
        }

        const profiles = listResponse.data.data;
        if (profiles.length === 0) {
            console.log('No existing profiles found. Please create some profiles in ixBrowser first.');
            return;
        }

        console.log(`Found ${profiles.length} existing profiles. Starting extension installation for each.`);

        // 3. Iterate Through Profiles and Install All Defined Extensions
        for (const profile of profiles) {
            const profileId = profile.id;
            const profileName = profile.name || `ID: ${profileId}`;
            console.log(`\n--- Processing Profile: ${profileName} (ID: ${profileId}) ---`);

            let installedCount = 0;
            let failedCount = 0;

            for (const extensionPath of extensionFullPaths) {
                const extensionFilename = path.basename(extensionPath);
                console.log(`  Attempting to install '${extensionFilename}'...`); // Log before attempt

                try {
                    const formData = new FormData();
                    formData.append('profileId', profileId);
                    formData.append('type', 'local');
                    formData.append('filePath', extensionPath);

                    const installResponse = await axios.post(`${IXBROWSER_API_BASE_URL}/extensions/install`, formData, {
                        headers: formData.getHeaders()
                    });

                    if (installResponse.data.code !== 0) {
                        console.error(`  FAILURE: Could not install '${extensionFilename}'. Error: ${installResponse.data.message}`);
                        failedCount++;
                    } else {
                        console.log(`  SUCCESS: '${extensionFilename}' installed.`);
                        installedCount++;
                    }
                } catch (installError) {
                    console.error(`  ERROR: An exception occurred while installing '${extensionFilename}': ${installError.message}`);
                    failedCount++;
                    // console.error(installError.response?.data || installError); // Uncomment for full API error response
                }
                // Small delay after each extension install attempt
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            console.log(`  --- Finished installing extensions for ${profileName}. Successfully installed: ${installedCount}, Failed: ${failedCount} ---`);
            // Larger delay after each profile is fully processed
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`\nFinished attempting to install all specified extensions to all existing profiles.`);

    } catch (error) {
        console.error(`Fatal error during profile listing or initial setup:`, error.message);
        // console.error(error.response?.data || error); // Uncomment for full API error response
    }
}

// Ensure you have axios and form-data installed:
// npm install axios form-data

installMultipleExtensionsToExistingProfiles();
