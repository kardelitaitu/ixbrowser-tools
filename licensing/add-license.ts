import { verifyLicense } from './app-validator';
import * as readline from 'readline';
import * as fs from 'fs'; // Node.js File System module
import * as path from 'path'; // Node.js Path module
import { stdin as input, stdout as output } from 'process';

/**
 * Creates a promise-based wrapper for the readline.question
 * to allow for async/await syntax.
 * @param query The question to display to the user.
 * @returns A promise that resolves with the user's answer.
 */
function askQuestion(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Main application function to run the interactive check and save.
 */
async function main() {
  console.log('--- Interactive License Saver ---');
  
  // 1. Initialize readline interface
  const rl = readline.createInterface({ input, output });

  let email: string = '';
  let key: string = '';

  try {
    // 2. Get user input
    email = await askQuestion(rl, 'Please enter your email: ');
    key = await askQuestion(rl, 'Please paste your license key: ');

    console.log('\n[Validator] Orchestrating validation, please wait...');

    // 3. Call the core verification logic
    const result = await verifyLicense(key, email);

    // 4. Report the result
    if (result.valid) {
      console.log('---------------------------------');
      console.log('✅ SUCCESS: License is valid!');
      console.log('---------------------------------');

      // Convert UNIX timestamp (in seconds) to a readable date
      const expDate = new Date(result.payload.exp * 1000);
      console.log(`Email: ${result.payload.email}`);
      console.log(`Expires: ${expDate.toUTCString()}`);
      console.log('---------------------------------');

      // 5. Save the valid key and email to .env file
      // process.cwd() is the directory where you *run* the script from
      const envPath = path.resolve(process.cwd(), '..', '.env');
      const envContent = [
        `\n# License details added on ${new Date().toUTCString()}`,
        `EMAIL="${email}"`,
        `LICENSE_KEY="${key}"\n`
      ].join('\n');

      // Use appendFileSync to add to the .env file without overwriting
      fs.appendFileSync(envPath, envContent, 'utf-8');

      console.log(`[LicenseManager] ✅ License details saved to ${envPath}`);
      console.log('---------------------------------');

    } else {
      console.log('---------------------------------');
      console.error(`❌ FAILURE: ${(result as { valid: false; reason: string }).reason}`);
      console.error('[LicenseManager] ❌ License not saved.');
      console.log('---------------------------------');
    }

  } catch (error) {
    // Catch any unexpected errors during validation
    console.error('\n[Validator] An unexpected system error occurred:');
    console.error(error);
  } finally {
    // 6. CRITICAL: Close the readline interface
    rl.close();
  }
}

// --- Run the main function ---
main();
