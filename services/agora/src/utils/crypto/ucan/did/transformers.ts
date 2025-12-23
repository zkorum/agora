// Copyright ts-odd team
// Apache v2 License
// Extracted from: https://github.com/oddsdk/ts-odd/tree/f90bde37416d9986d1c0afed406182a95ce7c1d7
import { equal } from "src/shared/arrbufs.js";
import { BASE58_DID_PREFIX } from "src/shared/did/util.js";
import * as uint8arrays from "uint8arrays";

import type * as Crypto from "../implementation.js";

/**
 * Determines if an ArrayBuffer has a given indeterminate length-prefix.
 */
export const hasPrefix = (
  prefixedKey: ArrayBuffer,
  prefix: ArrayBuffer
): boolean => {
  return equal(prefix, prefixedKey.slice(0, prefix.byteLength));
};

/**
 * Convert a base64 public key to a DID (did:key).
 */
export function publicKeyToDid(
  crypto: Crypto.Implementation,
  publicKey: Uint8Array,
  keyType: string
): string {
  // Prefix public-write key
  const prefix = crypto.did.keyTypes[keyType]?.magicBytes;
  if (prefix === null) {
    throw new Error(
      `Key type '${keyType}' not supported, available types: ${Object.keys(
        crypto.did.keyTypes
      ).join(", ")}`
    );
  }

  const prefixedBuf = uint8arrays.concat([prefix, publicKey]);

  // Encode prefixed
  return BASE58_DID_PREFIX + uint8arrays.toString(prefixedBuf, "base58btc");
}

/**
 * Convert a DID (did:key) to a base64 public key.
 */
export function didToPublicKey(
  crypto: Crypto.Implementation,
  did: string
): {
  publicKey: Uint8Array;
  type: string;
} {
  if (!did.startsWith(BASE58_DID_PREFIX)) {
    throw new Error("Please use a base58-encoded DID formatted `did:key:z...`");
  }

  const didWithoutPrefix = did.substr(BASE58_DID_PREFIX.length);
  const magicalBuf = uint8arrays.fromString(didWithoutPrefix, "base58btc");
  const result = Object.entries(crypto.did.keyTypes).find(([_key, attr]) =>
    // @ts-expect-error - TypeScript 5.9.2 stricter type checking for Uint8Array vs ArrayBuffer compatibility
    hasPrefix(magicalBuf, attr.magicBytes)
  );

  if (!result) {
    throw new Error("Unsupported key algorithm.");
  }

  return {
    publicKey: magicalBuf.slice(result[1].magicBytes.length),
    type: result[0],
  };
}
