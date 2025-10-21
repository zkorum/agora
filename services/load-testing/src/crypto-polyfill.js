/**
 * Polyfill for Node.js crypto module
 * Maps to k6's global crypto object which provides WebCrypto API
 */

// k6 provides a global crypto object with WebCrypto API
// Export it so dependencies that try to import 'crypto' can use it
export default globalThis.crypto;

// Also provide named exports for compatibility
export const webcrypto = globalThis.crypto;
export const subtle = globalThis.crypto?.subtle;
export const getRandomValues = (arr) => globalThis.crypto.getRandomValues(arr);
