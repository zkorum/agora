/**
 * k6-specific crypto implementation using k6's global WebCrypto API
 * This replaces node:crypto with k6's built-in crypto object
 * Note: k6 now provides WebCrypto globally, no need to import from k6/experimental/webcrypto
 * Uses in-memory keystore instead of IndexedDB (which k6 doesn't support)
 */

import { MemoryKeyStore } from "../../keystore/memory.js";
import * as uint8arrays from "uint8arrays";
import nacl from "tweetnacl";
import type { Implementation, ImplementationOptions } from "../implementation.js";

// k6 provides crypto globally
const webcrypto = crypto;

function isCryptoKey(key: CryptoKey | Uint8Array): key is CryptoKey {
    return typeof key === "object" && "type" in key;
}

// AES operations
const aes = {
    decrypt: aesDecrypt,
    encrypt: aesEncrypt,
    exportKey: aesExportKey,
    genKey: aesGenKey,
};

function importAesKey(
    key: Uint8Array,
    alg: string,
): Promise<CryptoKey> {
    return webcrypto.subtle.importKey(
        "raw",
        key,
        {
            name: alg,
            length: 256,
        },
        true,
        ["encrypt", "decrypt"],
    );
}

async function aesGenKey(alg: string): Promise<CryptoKey> {
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
    key: CryptoKey,
    iv: Uint8Array,
    alg: string,
): Promise<Uint8Array> {
    const cipher = await webcrypto.subtle.encrypt(
        {
            name: alg,
            iv,
        },
        key,
        data,
    );
    return new Uint8Array(cipher);
}

async function aesDecrypt(
    cipher: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array,
    alg: string,
): Promise<Uint8Array> {
    const decrypted = await webcrypto.subtle.decrypt(
        {
            name: alg,
            iv,
        },
        key,
        cipher,
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
    publicKey: CryptoKey,
): Promise<Uint8Array> {
    const cipher = await webcrypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
        },
        publicKey,
        data,
    );
    return new Uint8Array(cipher);
}

async function rsaDecrypt(
    cipher: Uint8Array,
    privateKey: CryptoKey,
): Promise<Uint8Array> {
    const decrypted = await webcrypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        privateKey,
        cipher,
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
    return new Uint8Array(await webcrypto.subtle.digest("SHA-256", bytes));
}

// DID key types
const did = {
    keyTypes: {
        ed25519: {
            magicBytes: new Uint8Array([0xed, 0x01]),
            verify: nacl.sign.detached.verify,
        },
        rsa: {
            magicBytes: new Uint8Array([0x00, 0xf5, 0x02]),
            verify: async ({ message, publicKey, signature }: {
                message: Uint8Array;
                publicKey: Uint8Array;
                signature: Uint8Array
            }): Promise<boolean> => {
                const key = await webcrypto.subtle.importKey(
                    "spki",
                    publicKey,
                    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                    false,
                    ["verify"]
                );
                return await webcrypto.subtle.verify(
                    "RSASSA-PKCS1-v1_5",
                    key,
                    signature,
                    message
                );
            },
        },
    },
};

// Random numbers
const misc = {
    randomNumbers,
};

function randomNumbers(length: number): Uint8Array {
    return webcrypto.getRandomValues(new Uint8Array(length));
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
            ): Promise<Uint8Array | null> => {
                try {
                    const key = await ks.getKey(prefixedKey);
                    if (key === null) {
                        return null;
                    }
                    return await rsaDecrypt(msg, key.privateKey);
                } catch (error) {
                    console.error("Decryption failed:", error);
                    return null;
                }
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
                    msg,
                );

                return new Uint8Array(signature);
            },
            createIfDoesNotExists: async (prefixedKey: string): Promise<any> => {
                // Use the keystore's built-in createIfDoesNotExist method
                // which handles write and exchange keys internally
                return await ks.createIfDoesNotExist(
                    `${prefixedKey}/write`,
                    `${prefixedKey}/exchange`
                );
            },
            publicWriteKey: async (prefixedKey: string): Promise<Uint8Array> => {
                const writeKeyName = `${prefixedKey}/write`;
                const keypair = await ks.writeKey(writeKeyName);
                const spki = await webcrypto.subtle.exportKey("spki", keypair.publicKey);
                return new Uint8Array(spki);
            },
            publicExchangeKey: async (prefixedKey: string): Promise<Uint8Array> => {
                const exchangeKeyName = `${prefixedKey}/exchange`;
                const keypair = await ks.exchangeKey(exchangeKeyName);
                const spki = await webcrypto.subtle.exportKey("spki", keypair.publicKey);
                return new Uint8Array(spki);
            },
            writeKeyExists: async (prefixedKey: string): Promise<boolean> => {
                const writeKeyName = `${prefixedKey}/write`;
                return await ks.keypairExists(writeKeyName);
            },
            exchangeKeyExists: async (prefixedKey: string): Promise<boolean> => {
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
            ): Promise<{
                write: { privateKey: JsonWebKey; publicKey: JsonWebKey };
                exchange: { privateKey: JsonWebKey; publicKey: JsonWebKey };
            }> => {
                return await ks.exportKeys(writeName, exchangeName);
            },
            importKeys: async (
                writeName: string,
                exchangeName: string,
                exportedKeys: {
                    write: { privateKey: JsonWebKey; publicKey: JsonWebKey };
                    exchange: { privateKey: JsonWebKey; publicKey: JsonWebKey };
                }
            ): Promise<any> => {
                return await ks.importKeys(writeName, exchangeName, exportedKeys);
            },
        },
    };
}
