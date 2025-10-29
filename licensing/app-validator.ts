/**
 * app-validator.ts (V4 - Human-Locked)
 *
 * The 'Validator' (Agent 2).
 * This module is embedded in your application to verify license keys.
 *
 * V4 Update:
 * - Implements "Human-Locked Licensing."
 * - The `app-identity.ts` dependency is REMOVED.
 * - The `verifyLicense` orchestrator now takes an `email` as the
 * local identifier, which your app must acquire from the user.
 */

// Use Node.js/global crypto
import { subtle } from 'node:crypto';
import { PUBLIC_KEY_JWK } from './public-key.artifact'; // Import the embedded key

// --- Configuration ---
// High-Availability (HA) Time Sources.
const TIME_SOURCES = [
  'https://www.google.com',
  'https://www.cloudflare.com',
];
const CRYPTO_ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN_ALGORITHM = { ...CRYPTO_ALGORITHM, hash: 'SHA-256' };

// --- Utilities ---
/**
 * Converts a URL-safe Base64 string back to an ArrayBuffer.
 * This is the Node.js/Electron-native implementation.
 * (Mnemonic: base64 -> buffer)
 */
function base64UrlToBuffer(base64: string): ArrayBuffer {
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  const buf = Buffer.from(base64, 'base64');
  // Convert Buffer to ArrayBuffer
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// --- Result Payloads (V4) ---
export interface LicensePayload {
  iss: string; // Issuer
  iat: number; // Issued At (Unix Timestamp)
  exp: number; // Expiration (Unix Timestamp)
  email: string; // The "Human Lock"
}

export type VerificationResult =
  | {
      valid: true;
      status: 'VALID';
      payload: LicensePayload;
    }
  | {
      valid: false;
      status:
        | 'INVALID_SIGNATURE'
        | 'INVALID_FORMAT'
        | 'EXPIRED'
        | 'TIME_API_FAILED'
        | 'IDENTIFIER_MISMATCH'; // Mnemonic: "Email Mismatch"
      reason: string;
    };

// --- Memoized Key Import (Performance) ---
// We only want to import the public key once on app startup.
let verificationKey: Promise<CryptoKey | null> | null = null;
function getVerificationKey(): Promise<CryptoKey> {
  if (!verificationKey) {
    console.log('[AppValidator] Importing verification key...');
    verificationKey = subtle.importKey(
      'jwk',
      PUBLIC_KEY_JWK as JsonWebKey,
      CRYPTO_ALGORITHM,
      true,
      ['verify'],
    ) as Promise<CryptoKey | null>;
  }
  return verificationKey;
}

// --- Agent: getTrueTime (HA HEAD Request Method) ---
/**
 * Agent: Fetches the 'true' current time from core infrastructure.
 * This is Security Check 3 (Liveness) and defeats system clock tampering.
 */
async function getTrueTime(): Promise<number | null> {
  console.log('[AppValidator] Contacting online time source (HA Fallback)...');

  for (let index = 0; index < TIME_SOURCES.length; index++) {
    const url = TIME_SOURCES[index];
    console.log(`[AppValidator] Attempt ${index + 1}/${TIME_SOURCES.length}: ${url}`);
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(4000), // 4-second timeout
      });

      const dateHeader = response.headers.get('Date');
      if (!dateHeader) {
        throw new Error(`No 'Date' header found from ${url}.`);
      }

      // The 'Date' header is in GMT. new Date() parses this correctly.
      const trueTimeMs = new Date(dateHeader).getTime();
      if (isNaN(trueTimeMs)) {
        throw new Error(`Failed to parse 'Date' header: ${dateHeader}`);
      }

      const trueTimeUnix = Math.floor(trueTimeMs / 1000); // Convert to seconds
      console.log(
        `[AppValidator] True time acquired: ${new Date(
          trueTimeUnix * 1000,
        ).toISOString()}`,
      );
      // Success
      return trueTimeUnix;
    } catch (err: any) {
      console.error(
        `[AppValidator] Attempt ${index + 1} failed: ${err.message}`,
      );
      // Continue to the next fallback source
    }
  }

  console.error(
    `[AppValidator] CRITICAL: All ${TIME_SOURCES.length} time source attempts failed.`,
  );
  return null;
}

// --- Orchestrator: verifyLicense (V4) ---
/**
 * Orchestrates the 3-check verification of a license key.
 * This is the primary function your application will call.
 *
 * @param licenseKey The 'payload.signature' string from the user.
 * @param email The user's email, acquired by your app's UI.
 */
export async function verifyLicense(
  licenseKey: string,
  email: string,
): Promise<VerificationResult> {
  const localEmail = email.toLowerCase().trim();
  console.log(
    `[AppValidator] Orchestrating validation for key <${licenseKey.substring(
      0,
      20,
    )}...> against local email <${localEmail}>`,
  );

  try {
    // 0. Load Key
    const publicKey = await getVerificationKey();

    // 1. Deconstruct Key
    const [payloadB64, signatureB64] = licenseKey.trim().split('.');
    if (!payloadB64 || !signatureB64) {
      throw new Error('Invalid key format. Expected payload.signature');
    }

    const payloadBuffer = base64UrlToBuffer(payloadB64);
    const signatureBuffer = base64UrlToBuffer(signatureB64);

    // 2. Security Check 1: Authenticity
    const isAuthentic = await subtle.verify(
      SIGN_ALGORITHM,
      publicKey,
      signatureBuffer,
      payloadBuffer,
    );

    if (!isAuthentic) {
      console.error('[AppValidator] Check 1 FAILED: Signature is INVALID.');
      return {
        valid: false,
        status: 'INVALID_SIGNATURE',
        reason: 'Key signature is not authentic. Key may be tampered or fake.',
      };
    }
    console.log('[AppValidator] Check 1 SUCCESS: Signature is authentic.');

    // 3. Decode Payload
    const payload: LicensePayload = JSON.parse(
      new TextDecoder().decode(payloadBuffer),
    );

    // 4. Security Check 2: Identifier Lock (V4)
    if (payload.email !== localEmail) {
      console.error(
        `[AppValidator] Check 2 FAILED: Email MISMATCH. Key is for <${payload.email}>, app is checking <${localEmail}>.`,
      );
      return {
        valid: false,
        status: 'IDENTIFIER_MISMATCH',
        reason: 'This license key is not valid for this email address.',
      };
    }
    console.log('[AppValidator] Check 2 SUCCESS: Email is MATCHED.');

    // 5. Security Check 3: Liveness (Time)
    const trueTime = await getTrueTime();

    if (trueTime === null) {
      console.error('[AppValidator] Check 3 FAILED: Could not get true time.');
      return {
        valid: false,
        status: 'TIME_API_FAILED',
        reason:
          'Could not connect to time server to verify license. Check internet connection.',
      };
    }

    const expiresHuman = new Date(payload.exp * 1000).toISOString();
    if (trueTime > payload.exp) {
      console.warn(
        `[AppValidator] Check 3 FAILED: Key expired on ${expiresHuman}.`,
      );
      return {
        valid: false,
        status: 'EXPIRED',
        reason: `License expired on ${expiresHuman}`,
      };
    }
    console.log(
      `[AppValidator] Check 3 SUCCESS: Key is active until ${expiresHuman}.`,
    );

    // 6. Success
    // All three checks passed.
    return {
      valid: true,
      status: 'VALID',
      payload,
    };
  } catch (err: any) {
    console.error(`[AppValidator] Validation FAILED: ${err.message}`);
    return {
      valid: false,
      status: 'INVALID_FORMAT',
      reason: `Failed to parse key: ${err.message}`,
    };
  }
}
