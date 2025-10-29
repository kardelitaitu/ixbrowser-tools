"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_validator_1 = require("./app-validator");
// --- PASTE YOUR KEY HERE ---
//npx ts-node test-validator.ts
// Replace this string with the key you copied from Step 1
const myLicenseKey = "eyJpc3MiOiJrYXJkZWxpdGFpdHUiLCJpYXQiOjE3NjE3NjMzMTIsImV4cCI6MTc2NDM1NTMxMiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.hkWwCN67I2lCtGqI_KoBanCFdGAj2OpKAwOcEX3hXaw-lhU7giX8roe-c3pjTSysWX9LKHaiD0mE7e2-jR3LqQ";
// --- SET THE EMAIL HERE ---
// This MUST match the email you used to generate the key
const myEmail = "test@example.com";
// This function will run the test
async function runTest() {
    console.log("Attempting to verify license...");
    // Call the verifyLicense function from app-validator
    const result = await (0, app_validator_1.verifyLicense)(myLicenseKey, myEmail);
    if (result.valid) {
        console.log("✅ SUCCESS: License is valid!");
        console.log("Payload:", result.payload);
    }
    else {
        console.error(`❌ FAILURE: ${result.reason}`);
    }
    // --- Test a failure case (wrong email) ---
    console.log("\nAttempting to verify with WRONG email...");
    const failResult = await (0, app_validator_1.verifyLicense)(myLicenseKey, "wrong@email.com");
    if (failResult.valid) {
        console.error("❌ FAILURE: License should have failed but was valid.");
    }
    else {
        console.log("✅ SUCCESS: License correctly failed as expected.");
        console.log(`Reason: ${failResult.reason}`);
    }
}
// Run the test
runTest();
