import { log } from "./app.js";
import { encode } from "./shared-app-api/base64.js";
import { stringToBytes } from "./shared/arrbufs.js";

// see https://nodejs.org/api/crypto.html for reasons behind dynamic ESM import
type CryptoModule = typeof import("node:crypto");
let crypto: CryptoModule;
try {
    crypto = await import("node:crypto");
} catch (err) {
    log.error("crypto support is disabled!");
    log.error(err);
}

// Used to generate cryptographically random user identifier (for VC and voting purpose, to preserve privacy)
export function generateRandomHex(): string {
    // 32 random bytes (16 would already be considered resistant to brute-force attacks and is often used as API token)
    const randomBytes = new Uint8Array(32);
    crypto.webcrypto.getRandomValues(randomBytes);
    return Buffer.from(randomBytes).toString("hex");
}

/**
 * Generates a cryptographically random, URL-safe, short identifier for conversations, opinions, and notifications.
 *
 * Uses 5 random bytes encoded in base64url, generating 7-8 character slugs.
 *
 * Keyspace: 2^40 = ~1.1 trillion possibilities
 *
 * Collision probability (Birthday paradox):
 * - 50% chance after ~1.3 million slugs
 * - 0.001% chance after ~40,000 slugs
 * - Negligible with typical usage patterns
 *
 * Note: For defense-in-depth, insert operations should catch unique constraint violations
 * and retry with a new slugId if a collision occurs (extremely rare).
 *
 * @returns A 7-8 character URL-safe string
 */
export function generateRandomSlugId(): string {
    const randomBytes = new Uint8Array(5);
    crypto.webcrypto.getRandomValues(randomBytes);
    return encode(randomBytes);
}

// Generate cryptographically random 6 digits code for email validation.
// Standard practice, used by Ory for example.
// Though Node's crypto functions - which are based on OpenSSL - aren't the most secure compared to libsodium, it's enough for this purpose as we also rate-limit the number of attempts.
export function generateOneTimeCode(): number {
    return crypto.randomInt(0, 999999);
}

export function codeToString(code: number): string {
    return code.toString().padStart(6, "0");
}

export function generateUUID() {
    return crypto.webcrypto.randomUUID();
}

export function generateSalt(length = 16): Uint8Array {
    const salt = new Uint8Array(length);
    crypto.webcrypto.getRandomValues(salt);
    return salt;
}

interface HashWithSaltProps {
    value: string;
    salt: Uint8Array;
}

export async function hashWithSalt({
    value,
    salt,
}: HashWithSaltProps): Promise<Uint8Array> {
    // Encode the value as a Uint8Array
    const valueBytes = stringToBytes(value);

    // Concatenate salt and value into a single Uint8Array
    const saltedValue = new Uint8Array(salt.length + valueBytes.length);
    saltedValue.set(salt);
    saltedValue.set(valueBytes, salt.length);

    // Hash the combined salt + value
    const hashBuffer = await crypto.subtle.digest("SHA-256", saltedValue);
    const hash = new Uint8Array(hashBuffer);

    return hash;
}
