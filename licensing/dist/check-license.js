"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const app_validator_1 = require("./app-validator");
const readline = __importStar(require("readline"));
const process_1 = require("process");
/**
 * Creates a promise-based wrapper for the readline.question
 * to allow for async/await syntax.
 * @param query The question to display to the user.
 * @returns A promise that resolves with the user's answer.
 */
function askQuestion(rl, query) {
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
    const rl = readline.createInterface({ input: process_1.stdin, output: process_1.stdout });
    let email = '';
    let key = '';
    try {
        // 2. Get user input
        email = await askQuestion(rl, 'Please enter your email: ');
        key = await askQuestion(rl, 'Please paste your license key: ');
        console.log('\n[Validator] Orchestrating validation, please wait...');
        // 3. Call the core verification logic
        const result = await (0, app_validator_1.verifyLicense)(key, email);
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
        }
        else {
            console.log('---------------------------------');
            console.error(`❌ FAILURE: ${result.status}`);
            console.log('---------------------------------');
        }
    }
    catch (error) {
        // Catch any unexpected errors during validation
        console.error('\n[Validator] An unexpected system error occurred:');
        console.error(error);
    }
    finally {
        // 5. CRITICAL: Close the readline interface
        // This allows the Node.js process to exit.
        rl.close();
    }
}
// --- Run the main function ---
main();
