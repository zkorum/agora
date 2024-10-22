import { log } from "./app.js";
import { base64 } from "./shared/common/index.js";

// see https://nodejs.org/api/crypto.html for reasons behind dynamic ESM import
type CryptoModule = typeof import("node:crypto");
let crypto: CryptoModule;
try {
    crypto = await import("node:crypto");
} catch (err) {
    log.error("crypto support is disabled!");
}

// Used to generate cryptographically random user identifier (for VC and voting purpose, to preserve privacy)
export function generateRandomHex(): string {
    // 32 random bytes (16 would already be considered resistant to brute-force attacks and is often used as API token)
    const randomBytes = new Uint8Array(32);
    crypto.webcrypto.getRandomValues(randomBytes);
    return Buffer.from(randomBytes).toString("hex");
}

// Used to generate cryptographically random, url-safe and short identifier for post/comment and presenting it in a url
export function generateRandomSlugId(): string {
    const randomBytes = new Uint8Array(4); // this accounts to pow(2, 8*4) = 429 Billions possibilities
    crypto.webcrypto.getRandomValues(randomBytes);
    return base64.encode(randomBytes); // generates a 6 char-long slug
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
