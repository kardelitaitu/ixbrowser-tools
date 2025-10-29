
import * as path from 'path';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
// import { getAppIdentifier } from './licensing/app-identity'; // Removed as per V4 update

const LICENSING_MASTER_PATH = path.join(__dirname, 'licensing-master');

async function runCommand(command: string, description?: string, directory?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: directory || LICENSING_MASTER_PATH }, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error.message}`);
        if (error.stderr) {
          console.error(`stderr: ${error.stderr}`);
        }
        return reject(error);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

async function testLicensing() {
  try {
    const privateKeyPath = path.join(LICENSING_MASTER_PATH, 'license_private.jwk');
    const keysExist = await fs.access(privateKeyPath).then(() => true).catch(() => false);

    if (!keysExist) {
      console.log('--- Running keygen ---');
      await runCommand('node license-manager.js keygen');
    } else {
      console.log('--- Keys already exist, skipping keygen ---');
    }

    console.log('--- Running embed ---');
    await runCommand('node license-manager.js embed');

    console.log('--- Content of public-key.artifact.ts after embed ---');
    const publicKeyArtifactContent = await fs.readFile('C:\\My Script\\ixbrowser-tools\\licensing\\public-key.artifact.ts', 'utf-8');
    console.log(publicKeyArtifactContent);

    console.log('--- Recompiling licensing directory ---');
    await runCommand('npx tsc', 'Compile licensing directory', 'C:\\My Script\\ixbrowser-tools\\licensing');



    console.log('--- Getting app identifier ---');
    // const appIdentifier = await getAppIdentifier(); // Removed as per V4 update
    // console.log(`App Identifier: ${appIdentifier}`);
    const appIdentifier = 'test@example.com'; // Use hardcoded email for V4
    console.log(`App Identifier: ${appIdentifier}`);

    console.log('--- Issuing license ---');
    const issueOutput = await runCommand(`node license-manager.js issue --identifier "${appIdentifier}"`);
    const licenseKeyMatch = issueOutput.match(/\n([a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+)\n/);
    if (!licenseKeyMatch || !licenseKeyMatch[1]) throw new Error('License key not found in issue output.');
    const licenseKey = licenseKeyMatch[1].trim();
    console.log(`License Key: ${licenseKey}`);

    console.log('--- Verifying license ---');
    await runCommand(`node license-manager.js verify "${licenseKey}" "${appIdentifier}"`);
    console.log('--- TEST PASSED ---');
  } catch (error) {
    console.error('--- TEST FAILED ---');
    console.error(error);
  } finally {
    console.log('--- Cleaning up ---');
    // Keep keys for reuse: await runCommand('del license_private.jwk license_public.jwk');
    await runCommand('del ..\\licensing\\app-settings.json');
    await runCommand('del ..\\licensing\\public-key.artifact.ts');
    await runCommand('del ..\\licensing\\app-identity.js');
    await runCommand('del ..\\licensing\\app-validator.js');
    await runCommand('del ..\\licensing\\public-key.artifact.js');
    await runCommand('del ..\\..\\test-licensing.js');
  }
}

testLicensing();
