/**
 * Crypto store singleton for k6 environment
 * Uses k6/experimental/webcrypto instead of node:crypto
 */

import * as K6Crypto from "./ucan/implementation/k6.js";
import { type Implementation } from "./ucan/implementation.js";

// In-memory store for k6 environment (load testing)
let k6CryptoStore: Implementation | undefined = undefined;

export async function getNodeCryptoStore(): Promise<Implementation> {
  if (k6CryptoStore !== undefined) {
    return k6CryptoStore;
  }
  k6CryptoStore = await K6Crypto.implementation({
    storeName: "agora-keys-loadtest",
  });
  return k6CryptoStore;
}
