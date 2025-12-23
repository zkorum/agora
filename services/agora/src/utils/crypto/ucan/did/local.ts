// Copyright ts-odd team
// Apache v2 License
// Extracted from: https://github.com/oddsdk/ts-odd/tree/f90bde37416d9986d1c0afed406182a95ce7c1d7
import type * as Crypto from "../implementation.js";
import { publicKeyToDid } from "./transformers.js";

/**
 * Create a DID based on the exchange key-pair.
 */
export async function exchange(
  crypto: Crypto.Implementation,
  emailOrUserId: string
): Promise<string> {
  const pubKey = await crypto.keystore.publicExchangeKey(emailOrUserId);
  const ksAlg = await crypto.keystore.getAlgorithm();

  return publicKeyToDid(crypto, pubKey, ksAlg);
}

/**
 * Create a DID based on the write key-pair.
 */
export async function write(
  crypto: Crypto.Implementation,
  emailOrUserId: string
): Promise<string> {
  const pubKey = await crypto.keystore.publicWriteKey(emailOrUserId);
  const ksAlg = await crypto.keystore.getAlgorithm();

  return publicKeyToDid(crypto, pubKey, ksAlg);
}
/**
 * Alias `exchange` to `sharing`
 */
export { exchange as sharing };

/**
 * Alias `write` to `agent`
 */
export { write as agent };

/**
 * Alias `write` to `ucan`
 */
export { write as ucan };
