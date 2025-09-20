// Copyright ts-odd team
// Apache v2 License
// Extracted from: https://github.com/oddsdk/ts-odd/tree/f90bde37416d9986d1c0afed406182a95ce7c1d7 https://github.com/oddsdk/ts-odd/tree/f90bde37416d9986d1c0afed406182a95ce7c1d7
import * as uint8arrays from "uint8arrays";
import tweetnacl from "tweetnacl";

import * as keystoreAES from "@zkorum/keystore-idb/aes/index.js";
import * as keystoreIDB from "@zkorum/keystore-idb/constants.js";
import type { SymmAlg } from "@zkorum/keystore-idb/types.js";
import { HashAlg, SymmKeyLength } from "@zkorum/keystore-idb/types.js";
import { RSAKeyStore } from "@zkorum/keystore-idb/rsa/index.js";
import rsaOperations from "@zkorum/keystore-idb/rsa/index.js";

import * as typeChecks from "src/utils/type-checks.js";
import {
  type Implementation,
  type ImplementationOptions,
  type VerifyArgs,
} from "../implementation.js";

const webcrypto = window.crypto;

// AES

export const aes = {
  decrypt: aesDecrypt,
  encrypt: aesEncrypt,
  exportKey: aesExportKey,
  genKey: aesGenKey,
};

export function importAesKey(
  key: Uint8Array,
  alg: SymmAlg
): Promise<CryptoKey> {
  return webcrypto.subtle.importKey(
    "raw",
    // @ts-expect-error - TypeScript 5.9.2 stricter type checking for Uint8Array vs BufferSource compatibility
    key,
    {
      name: alg,
      length: SymmKeyLength.B256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function aesDecrypt(
  encrypted: Uint8Array,
  key: CryptoKey | Uint8Array,
  alg: SymmAlg,
  iv?: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = typeChecks.isCryptoKey(key)
    ? key
    : await importAesKey(key, alg);
  const decrypted = iv
    ? // @ts-expect-error - TypeScript 5.9.2 stricter type checking for Uint8Array vs BufferSource compatibility
      await webcrypto.subtle.decrypt({ name: alg, iv }, cryptoKey, encrypted)
    : // the keystore version prefixes the `iv` into the cipher text
      await keystoreAES.decryptBytes(encrypted, cryptoKey, { alg });

  return new Uint8Array(decrypted);
}

export async function aesEncrypt(
  data: Uint8Array,
  key: CryptoKey | Uint8Array,
  alg: SymmAlg,
  iv?: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = typeChecks.isCryptoKey(key)
    ? key
    : await importAesKey(key, alg);

  // the keystore version prefixes the `iv` into the cipher text
  const encrypted = iv
    ? // @ts-expect-error - TypeScript 5.9.2 stricter type checking for Uint8Array vs BufferSource compatibility
      await webcrypto.subtle.encrypt({ name: alg, iv }, cryptoKey, data)
    : await keystoreAES.encryptBytes(data, cryptoKey, { alg });

  return new Uint8Array(encrypted);
}

export async function aesExportKey(key: CryptoKey): Promise<Uint8Array> {
  const buffer = await webcrypto.subtle.exportKey("raw", key);
  return new Uint8Array(buffer);
}

export function aesGenKey(alg: SymmAlg): Promise<CryptoKey> {
  return keystoreAES.makeKey({ length: SymmKeyLength.B256, alg });
}

// DID

export const did: Implementation["did"] = {
  keyTypes: {
    "bls12-381": {
      magicBytes: new Uint8Array([0xea, 0x01]),
      verify: () => {
        throw new Error("Not implemented");
      },
    },
    ed25519: {
      magicBytes: new Uint8Array([0xed, 0x01]),
      verify: ed25519Verify,
    },
    rsa: {
      magicBytes: new Uint8Array([0x00, 0xf5, 0x02]),
      verify: rsaVerify,
    },
  },
};

export function ed25519Verify({
  message,
  publicKey,
  signature,
}: VerifyArgs): boolean {
  return tweetnacl.sign.detached.verify(message, signature, publicKey);
}

export async function rsaVerify({
  message,
  publicKey,
  signature,
}: VerifyArgs): Promise<boolean> {
  return rsaOperations.verify(
    message,
    signature,
    await webcrypto.subtle.importKey(
      "spki",
      // @ts-expect-error - TypeScript 5.9.2 stricter type checking for Uint8Array vs BufferSource compatibility
      publicKey,
      { name: keystoreIDB.RSA_WRITE_ALG, hash: RSA_HASHING_ALGORITHM },
      false,
      ["verify"]
    ),
    8
  );
}

// HASH

export const hash = {
  sha256,
};

export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  // @ts-expect-error - TypeScript 5.9.2 stricter type checking for Uint8Array vs BufferSource compatibility
  return new Uint8Array(await webcrypto.subtle.digest("sha-256", bytes));
}

// KEYSTORE

function ksSymmIdentifier(_ks: RSAKeyStore, prefixedKey: string) {
  return `${prefixedKey}:symm`;
}

function ksExchangeIdentifier(_ks: RSAKeyStore, prefixedKey: string): string {
  return `${prefixedKey}:exchange`;
}

function ksWriteIdentifier(_ks: RSAKeyStore, prefixedKey: string): string {
  return `${prefixedKey}:write`;
}

export function ksClearStore(ks: RSAKeyStore): Promise<void> {
  return ks.destroy();
}

export async function ksDecrypt(
  ks: RSAKeyStore,
  cipherText: Uint8Array,
  prefixedKey: string
): Promise<Uint8Array> {
  const exchangeKeyName = ksExchangeIdentifier(ks, prefixedKey);
  const exchangeKey = await ks.exchangeKey(exchangeKeyName);

  return rsaDecrypt(cipherText, exchangeKey.privateKey);
}

export async function ksExportSymmKey(
  ks: RSAKeyStore,
  prefixedKey: string
): Promise<Uint8Array> {
  const keyName = ksSymmIdentifier(ks, prefixedKey);
  if ((await ks.keyExists(keyName)) === false) {
    throw new Error(
      `Expected a key under the name '${keyName}', but couldn't find anything`
    );
    // We're throwing an error here so that the function `getSymmKey` below doesn't create a key.
  }

  const key = await ks.getSymmKey(keyName);
  const raw = await webcrypto.subtle.exportKey("raw", key);

  return new Uint8Array(raw);
}

export function ksGetAlgorithm(_ks: RSAKeyStore): Promise<string> {
  return Promise.resolve("rsa");
}

export function ksGetUcanAlgorithm(_ks: RSAKeyStore): Promise<string> {
  return Promise.resolve("RS256");
}

export function ksImportSymmKey(
  ks: RSAKeyStore,
  key: Uint8Array,
  prefixedKey: string
): Promise<void> {
  const symmKeyName = ksSymmIdentifier(ks, prefixedKey);
  return ks.importSymmKey(uint8arrays.toString(key, "base64pad"), symmKeyName);
}

export function ksSymmKeyExists(
  ks: RSAKeyStore,
  prefixedKey: string
): Promise<boolean> {
  const keyName = ksSymmIdentifier(ks, prefixedKey);
  return ks.keyExists(keyName);
}

export function ksWriteKeyExists(
  ks: RSAKeyStore,
  prefixedKey: string
): Promise<boolean> {
  const keyName = ksWriteIdentifier(ks, prefixedKey);
  return ks.keypairExists(keyName);
}

export function ksExchangeKeyExists(
  ks: RSAKeyStore,
  prefixedKey: string
): Promise<boolean> {
  const keyName = ksExchangeIdentifier(ks, prefixedKey);
  return ks.keypairExists(keyName);
}

export async function ksPublicExchangeKey(
  ks: RSAKeyStore,
  prefixedKey: string
): Promise<Uint8Array> {
  const keypair = await ks.exchangeKey(ksExchangeIdentifier(ks, prefixedKey));
  const spki = await webcrypto.subtle.exportKey("spki", keypair.publicKey);

  return new Uint8Array(spki);
}

export async function ksPublicWriteKey(
  ks: RSAKeyStore,
  prefixedKey: string
): Promise<Uint8Array> {
  const keypair = await ks.writeKey(ksWriteIdentifier(ks, prefixedKey));
  const spki = await webcrypto.subtle.exportKey("spki", keypair.publicKey);

  return new Uint8Array(spki);
}

export async function ksSign(
  ks: RSAKeyStore,
  message: Uint8Array,
  prefixedKey: string
): Promise<Uint8Array> {
  const writeKeyName = ksWriteIdentifier(ks, prefixedKey);
  const writeKey = await ks.writeKey(writeKeyName);
  const arrayBuffer = await rsaOperations.sign(
    message,
    writeKey.privateKey,
    ks.cfg.charSize
  );

  return new Uint8Array(arrayBuffer);
}

export async function ksCreateIfDoesNotExist(
  ks: RSAKeyStore,
  prefixedKey: string
): Promise<RSAKeyStore> {
  return await ks.createIfDoesNotExist(
    ksWriteIdentifier(ks, prefixedKey),
    ksExchangeIdentifier(ks, prefixedKey)
  );
}

export async function ksCreateOverwriteIfAlreadyExists(
  ks: RSAKeyStore,
  prefixedKey: string
): Promise<RSAKeyStore> {
  return await ks.createOverwriteIfAlreadyExists(
    ksWriteIdentifier(ks, prefixedKey),
    ksExchangeIdentifier(ks, prefixedKey)
  );
}

export async function ksCopyKeypairs(
  ks: RSAKeyStore,
  fromPrefixedKey: string,
  toPrefixedKey: string
): Promise<void> {
  // NOTE: no content is deleted from the "from" key names
  const fromWriteKeyName = ksWriteIdentifier(ks, fromPrefixedKey);
  const toWriteKeyName = ksWriteIdentifier(ks, toPrefixedKey);
  await ks.copyKeypair(fromWriteKeyName, toWriteKeyName);

  const fromExchangeKeyName = ksExchangeIdentifier(ks, fromPrefixedKey);
  const toExchangeKeyName = ksExchangeIdentifier(ks, toPrefixedKey);
  await ks.copyKeypair(fromExchangeKeyName, toExchangeKeyName);
}

// MISC

export const misc = {
  randomNumbers,
};

export function randomNumbers(options: { amount: number }): Uint8Array {
  return webcrypto.getRandomValues(new Uint8Array(options.amount));
}

// RSA

export const rsa = {
  decrypt: rsaDecrypt,
  encrypt: rsaEncrypt,
  exportPublicKey: rsaExportPublicKey,
  genKey: rsaGenKey,
};

// RSA
// ---
// Exchange keys:

export const RSA_ALGORITHM = "RSA-OAEP";
export const RSA_HASHING_ALGORITHM = "SHA-256";

export function importRsaKey(
  key: Uint8Array,
  keyUsages: KeyUsage[]
): Promise<CryptoKey> {
  return webcrypto.subtle.importKey(
    "spki",
    // @ts-expect-error - TypeScript 5.9.2 stricter type checking for Uint8Array vs BufferSource compatibility
    key,
    { name: RSA_ALGORITHM, hash: RSA_HASHING_ALGORITHM },
    false,
    keyUsages
  );
}

export async function rsaDecrypt(
  data: Uint8Array,
  privateKey: CryptoKey | Uint8Array
): Promise<Uint8Array> {
  const arrayBuffer = await webcrypto.subtle.decrypt(
    {
      name: RSA_ALGORITHM,
    },
    typeChecks.isCryptoKey(privateKey)
      ? privateKey
      : await importRsaKey(privateKey, ["decrypt"]),
    // @ts-expect-error - TypeScript 5.9.2 stricter type checking for Uint8Array vs BufferSource compatibility
    data
  );

  return new Uint8Array(arrayBuffer);
}

export async function rsaEncrypt(
  message: Uint8Array,
  publicKey: CryptoKey | Uint8Array
): Promise<Uint8Array> {
  const key = typeChecks.isCryptoKey(publicKey)
    ? publicKey
    : await importRsaKey(publicKey, ["encrypt"]);

  const arrayBuffer = await webcrypto.subtle.encrypt(
    {
      name: RSA_ALGORITHM,
    },
    key,
    // @ts-expect-error - TypeScript 5.9.2 stricter type checking for Uint8Array vs BufferSource compatibility
    message
  );

  return new Uint8Array(arrayBuffer);
}

export async function rsaExportPublicKey(key: CryptoKey): Promise<Uint8Array> {
  const buffer = await webcrypto.subtle.exportKey("spki", key);
  return new Uint8Array(buffer);
}

export function rsaGenKey(): Promise<CryptoKeyPair> {
  return webcrypto.subtle.generateKey(
    {
      name: RSA_ALGORITHM,
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: RSA_HASHING_ALGORITHM },
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function ksDeleteKey(
  ks: RSAKeyStore,
  prefixedKey: string
): Promise<void> {
  return await ks.deleteKey(prefixedKey);
}

// 🛳

export async function implementation({
  storeName,
}: ImplementationOptions): Promise<Implementation> {
  const ks = await RSAKeyStore.init({
    charSize: 8,
    hashAlg: HashAlg.SHA_256,
    storeName: storeName,
  });

  return {
    aes,
    did,
    hash,
    misc,
    rsa,

    keystore: {
      clearStore: (...args) => ksClearStore(ks, ...args),
      decrypt: (...args) => ksDecrypt(ks, ...args),
      exportSymmKey: (...args) => ksExportSymmKey(ks, ...args),
      getAlgorithm: (...args) => ksGetAlgorithm(ks, ...args),
      getUcanAlgorithm: (...args) => ksGetUcanAlgorithm(ks, ...args),
      importSymmKey: (...args) => ksImportSymmKey(ks, ...args),
      symmKeyExists: (...args) => ksSymmKeyExists(ks, ...args),
      writeKeyExists: (...args) => ksWriteKeyExists(ks, ...args),
      exchangeKeyExists: (...args) => ksExchangeKeyExists(ks, ...args),
      publicExchangeKey: (...args) => ksPublicExchangeKey(ks, ...args),
      publicWriteKey: (...args) => ksPublicWriteKey(ks, ...args),
      sign: (...args) => ksSign(ks, ...args),
      createIfDoesNotExists: (...args) => ksCreateIfDoesNotExist(ks, ...args),
      createOverwriteIfAlreadyExists: (...args) =>
        ksCreateOverwriteIfAlreadyExists(ks, ...args),
      copyKeypairs: (...args) => ksCopyKeypairs(ks, ...args),
      deleteKey: (...args) => ksDeleteKey(ks, ...args),
    },
  };
}
