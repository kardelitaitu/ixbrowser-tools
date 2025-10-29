import { verifyLicense } from './app-validator';

// --- New Imports ---
// We need 'dotenv' to read the .env file
// We need 'path' to correctly locate the .env file in the parent directory
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Main application function to run the automated check from .env
 */
async function main() {
  console.log('--- Automated License Verification Tool ---');

  // 1. Configure and load environment variables
  // We must point to the *same* .env file as add-license.ts (one dir up)
  const envPath = path.resolve(process.cwd(), '..', '.env');
  
  console.log(`[Validator] Loading credentials from: ${envPath}`);
  const configResult = dotenv.config({ path: envPath });

  // Error handling if the .env file itself is missing
  if (configResult.error) {
    console.error(`[Validator] ❌ FATAL: Could not load .env file from ${envPath}`);
    console.error('       Please run the `add-license.ts` script first.');
    console.error(configResult.error);
    return; // Exit
  }

  // 2. Get credentials from process.env
  const email = process.env.EMAIL;
  const key = process.env.LICENSE_KEY;

  // 3. Validate that variables were found inside the .env file
  if (!email || !key) {
    console.error('---------------------------------');
    console.error('❌ FAILURE: EMAIL or LICENSE_KEY not found in .env file.');
    console.error('       Please run the `add-license.ts` script again.');
    console.error('---------------------------------');
    return; // Exit
  }

  console.log(`[Validator] Found Email: ${email}`);
  console.log('[Validator] Orchestrating validation, please wait...');

  try {
    // 4. Call the core verification logic
    const result = await verifyLicense(key, email);

    // 5. Report the result
    if (result.valid) {
      console.log('---------------------------------');
      console.log('✅ SUCCESS: License is valid!');
      console.log('---------------------------------');
      console.log(`Email: ${result.payload.email}`);

      // Convert UNIX timestamp (in seconds) to a readable date
      const expDate = new Date(result.payload.exp * 1000);
      console.log(`Expires: ${expDate.toUTCString()}`);
      console.log('---------------------------------');
    } else {
      console.log('---------------------------------');
      console.error(`❌ FAILURE: ${(result as { valid: false; reason: string }).reason}`);
      console.log('---------------------------------');
    }

  } catch (error) {
    // Catch any unexpected errors during validation
    console.error('\n[Validator] An unexpected system error occurred:');
    console.error(error);
  }
  // No 'finally' block needed as there's no readline interface to close
}

// --- Run the main function ---
main();
