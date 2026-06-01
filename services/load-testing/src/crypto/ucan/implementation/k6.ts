/**
 * k6-specific crypto implementation using k6's global WebCrypto API
 * This replaces node:crypto with k6's built-in crypto object
 * Note: k6 now provides WebCrypto globally, no need to import from k6/experimental/webcrypto
 * Uses in-memory keystore instead of IndexedDB (which k6 doesn't support)
 */

import { MemoryKeyStore } from "../../keystore/memory.js";
import nacl from "tweetnacl";
import type {
    ExportedKeypairs,
    Implementation,
    ImplementationOptions,
    VerifyArgs,
} from "../implementation.js";
import { SymmAlg } from "@zkorum/keystore-idb/types.js";

type AesAlgorithmParams =
    | {
          name: SymmAlg.AES_CTR;
          counter: Uint8Array<ArrayBuffer>;
          length: number;
      }
    | {
          name: SymmAlg.AES_CBC | SymmAlg.AES_GCM;
          iv: Uint8Array<ArrayBuffer>;
      };

// k6 provides crypto globally
const webcrypto = crypto;

function isCryptoKey(key: CryptoKey | Uint8Array): key is CryptoKey {
    return typeof key === "object" && "type" in key;
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
    return new Uint8Array(bytes);
}

function createAesAlgorithmParams(
    alg: SymmAlg,
    iv: Uint8Array,
): AesAlgorithmParams {
    if (alg === SymmAlg.AES_CTR) {
        return {
            name: alg,
            counter: copyBytes(iv),
            length: 64,
        };
    }
    return {
        name: alg,
        iv: copyBytes(iv),
    };
}

// AES operations
const aes = {
    decrypt: aesDecrypt,
    encrypt: aesEncrypt,
    exportKey: aesExportKey,
    genKey: aesGenKey,
};

function importAesKey(key: Uint8Array, alg: SymmAlg): Promise<CryptoKey> {
    return webcrypto.subtle.importKey(
        "raw",
        copyBytes(key),
        {
            name: alg,
            length: 256,
        },
        true,
        ["encrypt", "decrypt"],
    );
}

async function aesGenKey(alg: SymmAlg): Promise<CryptoKey> {
    return webcrypto.subtle.generateKey(
        {
            name: alg,
            length: 256,
        },
        true,
        ["encrypt", "decrypt"],
    );
}

async function aesEncrypt(
    data: Uint8Array,
    key: CryptoKey | Uint8Array,
    alg: SymmAlg,
    iv?: Uint8Array,
): Promise<Uint8Array> {
    const cryptoKey = isCryptoKey(key) ? key : await importAesKey(key, alg);
    const resolvedIv = iv ?? randomNumbers({ amount: 16 });
    const cipher = await webcrypto.subtle.encrypt(
        createAesAlgorithmParams(alg, resolvedIv),
        cryptoKey,
        copyBytes(data),
    );
    const cipherBytes = new Uint8Array(cipher);
    if (iv !== undefined) {
        return cipherBytes;
    }
    const prefixedCipherBytes = new Uint8Array(
        resolvedIv.byteLength + cipherBytes.byteLength,
    );
    prefixedCipherBytes.set(resolvedIv, 0);
    prefixedCipherBytes.set(cipherBytes, resolvedIv.byteLength);
    return prefixedCipherBytes;
}

async function aesDecrypt(
    encrypted: Uint8Array,
    key: CryptoKey | Uint8Array,
    alg: SymmAlg,
    iv?: Uint8Array,
): Promise<Uint8Array> {
    const cryptoKey = isCryptoKey(key) ? key : await importAesKey(key, alg);
    const resolvedIv = iv ?? encrypted.slice(0, 16);
    const cipherText = iv === undefined ? encrypted.slice(16) : encrypted;
    const decrypted = await webcrypto.subtle.decrypt(
        createAesAlgorithmParams(alg, resolvedIv),
        cryptoKey,
        copyBytes(cipherText),
    );
    return new Uint8Array(decrypted);
}

async function aesExportKey(key: CryptoKey): Promise<Uint8Array> {
    const exported = await webcrypto.subtle.exportKey("raw", key);
    return new Uint8Array(exported);
}

// RSA operations
const rsa = {
    decrypt: rsaDecrypt,
    encrypt: rsaEncrypt,
    exportPublicKey: rsaExportPublicKey,
    genKey: rsaGenKey,
};

async function rsaGenKey(): Promise<CryptoKeyPair> {
    return webcrypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: { name: "SHA-256" },
        },
        true,
        ["encrypt", "decrypt"],
    );
}

async function rsaEncrypt(
    data: Uint8Array,
    publicKey: CryptoKey | Uint8Array,
): Promise<Uint8Array> {
    const key = isCryptoKey(publicKey)
        ? publicKey
        : await webcrypto.subtle.importKey(
              "spki",
              copyBytes(publicKey),
              { name: "RSA-OAEP", hash: "SHA-256" },
              false,
              ["encrypt"],
          );
    const cipher = await webcrypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
        },
        key,
        copyBytes(data),
    );
    return new Uint8Array(cipher);
}

async function rsaDecrypt(
    cipher: Uint8Array,
    privateKey: CryptoKey | Uint8Array,
): Promise<Uint8Array> {
    if (!isCryptoKey(privateKey)) {
        throw new Error("Raw RSA private keys are not supported in k6 mode");
    }
    const decrypted = await webcrypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        privateKey,
        copyBytes(cipher),
    );
    return new Uint8Array(decrypted);
}

async function rsaExportPublicKey(publicKey: CryptoKey): Promise<Uint8Array> {
    const exported = await webcrypto.subtle.exportKey("spki", publicKey);
    return new Uint8Array(exported);
}

// Hash operations
const hash = {
    sha256,
};

export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(
        await webcrypto.subtle.digest("SHA-256", copyBytes(bytes)),
    );
}

// DID key types
const did = {
    keyTypes: {
        ed25519: {
            magicBytes: new Uint8Array([0xed, 0x01]),
            verify: ({ message, publicKey, signature }: VerifyArgs): boolean =>
                nacl.sign.detached.verify(message, signature, publicKey),
        },
        rsa: {
            magicBytes: new Uint8Array([0x00, 0xf5, 0x02]),
            verify: async ({
                message,
                publicKey,
                signature,
            }: VerifyArgs): Promise<boolean> => {
                const key = await webcrypto.subtle.importKey(
                    "spki",
                    copyBytes(publicKey),
                    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                    false,
                    ["verify"],
                );
                return await webcrypto.subtle.verify(
                    "RSASSA-PKCS1-v1_5",
                    key,
                    copyBytes(signature),
                    copyBytes(message),
                );
            },
        },
    },
};

// Random numbers
const misc = {
    randomNumbers,
};

function randomNumbers({ amount }: { amount: number }): Uint8Array {
    return webcrypto.getRandomValues(new Uint8Array(amount));
}

// Main implementation factory
export async function implementation({
    storeName,
}: ImplementationOptions): Promise<Implementation> {
    const ks = await MemoryKeyStore.init();

    return {
        aes,
        did,
        hash,
        misc,
        rsa,
        keystore: {
            clearStore: async (): Promise<void> => {
                await ks.clear();
            },
            decrypt: async (
                msg: Uint8Array,
                prefixedKey: string,
            ): Promise<Uint8Array> => {
                const exchangeKeyName = `${prefixedKey}/exchange`;
                const key = await ks.exchangeKey(exchangeKeyName);
                return await rsaDecrypt(msg, key.privateKey);
            },
            sign: async (
                msg: Uint8Array,
                prefixedKey: string,
            ): Promise<Uint8Array> => {
                const writeKeyName = `${prefixedKey}/write`;
                const writeKey = await ks.writeKey(writeKeyName);

                // Use WebCrypto to sign directly
                const signature = await webcrypto.subtle.sign(
                    "RSASSA-PKCS1-v1_5",
                    writeKey.privateKey,
                    copyBytes(msg),
                );

                return new Uint8Array(signature);
            },
            createIfDoesNotExists: async (
                prefixedKey: string,
            ): Promise<unknown> => {
                return await ks.createIfDoesNotExist(
                    `${prefixedKey}/write`,
                    `${prefixedKey}/exchange`,
                );
            },
            createOverwriteIfAlreadyExists: async (
                prefixedKey: string,
            ): Promise<unknown> => {
                return await ks.createOverwriteIfAlreadyExists(
                    `${prefixedKey}/write`,
                    `${prefixedKey}/exchange`,
                );
            },
            copyKeypairs: async (
                fromPrefixedKey: string,
                toPrefixedKey: string,
            ): Promise<void> => {
                await ks.copyKeypair(
                    `${fromPrefixedKey}/write`,
                    `${toPrefixedKey}/write`,
                );
                await ks.copyKeypair(
                    `${fromPrefixedKey}/exchange`,
                    `${toPrefixedKey}/exchange`,
                );
            },
            deleteKey: async (prefixedKey: string): Promise<void> => {
                await ks.deleteKey(`${prefixedKey}/write`);
                await ks.deleteKey(`${prefixedKey}/exchange`);
                await ks.deleteKey(`${prefixedKey}/symm`);
            },
            exportSymmKey: async (prefixedKey: string): Promise<Uint8Array> => {
                return await ks.exportSymmKey(`${prefixedKey}/symm`);
            },
            importSymmKey: async (
                key: Uint8Array,
                prefixedKey: string,
            ): Promise<void> => {
                await ks.importSymmKey(key, `${prefixedKey}/symm`);
            },
            symmKeyExists: async (prefixedKey: string): Promise<boolean> => {
                return await ks.symmKeyExists(`${prefixedKey}/symm`);
            },
            publicWriteKey: async (
                prefixedKey: string,
            ): Promise<Uint8Array> => {
                const writeKeyName = `${prefixedKey}/write`;
                const keypair = await ks.writeKey(writeKeyName);
                const spki = await webcrypto.subtle.exportKey(
                    "spki",
                    keypair.publicKey,
                );
                return new Uint8Array(spki);
            },
            publicExchangeKey: async (
                prefixedKey: string,
            ): Promise<Uint8Array> => {
                const exchangeKeyName = `${prefixedKey}/exchange`;
                const keypair = await ks.exchangeKey(exchangeKeyName);
                const spki = await webcrypto.subtle.exportKey(
                    "spki",
                    keypair.publicKey,
                );
                return new Uint8Array(spki);
            },
            writeKeyExists: async (prefixedKey: string): Promise<boolean> => {
                const writeKeyName = `${prefixedKey}/write`;
                return await ks.keypairExists(writeKeyName);
            },
            exchangeKeyExists: async (
                prefixedKey: string,
            ): Promise<boolean> => {
                const exchangeKeyName = `${prefixedKey}/exchange`;
                return await ks.keypairExists(exchangeKeyName);
            },
            getAlgorithm: async (): Promise<string> => {
                return "rsa";
            },
            getUcanAlgorithm: async (): Promise<string> => {
                return "RS256";
            },
            exportKeys: async (
                writeName: string,
                exchangeName: string,
            ): Promise<ExportedKeypairs> => {
                return await ks.exportKeys(writeName, exchangeName);
            },
            importKeys: async (
                writeName: string,
                exchangeName: string,
                exportedKeys: ExportedKeypairs,
            ): Promise<void> => {
                await ks.importKeys(
                    writeName,
                    exchangeName,
                    exportedKeys,
                );
            },
        },
    };
}
