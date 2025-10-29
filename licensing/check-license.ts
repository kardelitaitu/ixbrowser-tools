import { verifyLicense } from './app-validator';
import * as readline from 'readline';
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
 * Main application function to run the interactive check.
 */
async function main() {
  console.log('--- Interactive License Verification Tool ---');
  
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
      console.log(`Email: ${result.payload.email}`);

      // Convert UNIX timestamp (in seconds) to a readable date
      const expDate = new Date(result.payload.exp * 1000);
      console.log(`Expires: ${expDate.toUTCString()}`);
      console.log('---------------------------------');
    } else {
      console.log('---------------------------------');
      console.error(`❌ FAILURE: ${result.status}`);
      console.log('---------------------------------');
    }

  } catch (error: any) {
    // Catch any unexpected errors during validation
    console.error('\n[Validator] An unexpected system error occurred:');
    console.error(error);
  } finally {
    // 5. CRITICAL: Close the readline interface
    // This allows the Node.js process to exit.
    rl.close();
  }
}

// --- Run the main function ---
main();
