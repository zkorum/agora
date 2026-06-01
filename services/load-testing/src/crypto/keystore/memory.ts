/**
 * In-memory keystore for k6 load testing
 * Replaces IndexedDB-based keystore with a simple in-memory Map
 */

import type { ExportedKeypairs } from "../ucan/implementation.js";

interface InMemoryKeyStore {
    init: () => Promise<InMemoryKeyStore>;
    clear: () => Promise<void>;
    keypairExists: (name: string) => Promise<boolean>;
    getKey: (name: string) => Promise<CryptoKeyPair | null>;
    writeKey: (name: string) => Promise<CryptoKeyPair>;
    exchangeKey: (name: string) => Promise<CryptoKeyPair>;
    createIfDoesNotExist: (
        writeName: string,
        exchangeName: string,
    ) => Promise<InMemoryKeyStore>;
    createOverwriteIfAlreadyExists: (
        writeName: string,
        exchangeName: string,
    ) => Promise<InMemoryKeyStore>;
    copyKeypair: (fromName: string, toName: string) => Promise<void>;
    deleteKey: (name: string) => Promise<void>;
    exportKeys: (
        writeName: string,
        exchangeName: string,
    ) => Promise<ExportedKeypairs>;
    importKeys: (
        writeName: string,
        exchangeName: string,
        exportedKeys: ExportedKeypairs,
    ) => Promise<InMemoryKeyStore>;
    exportSymmKey: (name: string) => Promise<Uint8Array>;
    importSymmKey: (key: Uint8Array, name: string) => Promise<void>;
    symmKeyExists: (name: string) => Promise<boolean>;
    cfg: {
        charSize: number;
        hashAlg: string;
        storeName: string;
    };
}

// Simple in-memory storage for RSA keypairs
const keypairStore = new Map<string, CryptoKeyPair>();
const symmKeyStore = new Map<string, CryptoKey>();

export const MemoryKeyStore: InMemoryKeyStore = {
    async init() {
        return this;
    },

    async clear(): Promise<void> {
        keypairStore.clear();
        symmKeyStore.clear();
    },

    async keypairExists(name: string): Promise<boolean> {
        return keypairStore.has(name);
    },

    async getKey(name: string): Promise<CryptoKeyPair | null> {
        return keypairStore.get(name) || null;
    },

    async writeKey(name: string): Promise<CryptoKeyPair> {
        const keypair = keypairStore.get(name);
        if (!keypair) {
            throw new Error(`Keypair not found: ${name}`);
        }
        return keypair;
    },

    async exchangeKey(name: string): Promise<CryptoKeyPair> {
        const keypair = keypairStore.get(name);
        if (!keypair) {
            throw new Error(`Keypair not found: ${name}`);
        }
        return keypair;
    },

    async createIfDoesNotExist(
        writeName: string,
        exchangeName: string,
    ): Promise<InMemoryKeyStore> {
        if (!keypairStore.has(writeName)) {
            const writeKeypair = await crypto.subtle.generateKey(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: { name: "SHA-256" },
                },
                true,
                ["sign", "verify"],
            );
            keypairStore.set(writeName, writeKeypair);
        }

        if (!keypairStore.has(exchangeName)) {
            const exchangeKeypair = await crypto.subtle.generateKey(
                {
                    name: "RSA-OAEP",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: { name: "SHA-256" },
                },
                true,
                ["encrypt", "decrypt"],
            );
            keypairStore.set(exchangeName, exchangeKeypair);
        }

        return this;
    },

    async createOverwriteIfAlreadyExists(
        writeName: string,
        exchangeName: string,
    ): Promise<InMemoryKeyStore> {
        keypairStore.delete(writeName);
        keypairStore.delete(exchangeName);
        return await this.createIfDoesNotExist(writeName, exchangeName);
    },

    async copyKeypair(fromName: string, toName: string): Promise<void> {
        const keypair = keypairStore.get(fromName);
        if (!keypair) {
            throw new Error(`Keypair not found: ${fromName}`);
        }
        keypairStore.set(toName, keypair);
    },

    async deleteKey(name: string): Promise<void> {
        keypairStore.delete(name);
        symmKeyStore.delete(name);
    },

    async exportKeys(
        writeName: string,
        exchangeName: string,
    ): Promise<ExportedKeypairs> {
        const writeKeypair = keypairStore.get(writeName);
        const exchangeKeypair = keypairStore.get(exchangeName);

        if (!writeKeypair || !exchangeKeypair) {
            throw new Error(`Keys not found: ${writeName} or ${exchangeName}`);
        }

        const [
            writePrivateJwk,
            writePublicJwk,
            exchangePrivateJwk,
            exchangePublicJwk,
        ] = await Promise.all([
            crypto.subtle.exportKey("jwk", writeKeypair.privateKey),
            crypto.subtle.exportKey("jwk", writeKeypair.publicKey),
            crypto.subtle.exportKey("jwk", exchangeKeypair.privateKey),
            crypto.subtle.exportKey("jwk", exchangeKeypair.publicKey),
        ]);

        return {
            write: {
                privateKey: writePrivateJwk,
                publicKey: writePublicJwk,
            },
            exchange: {
                privateKey: exchangePrivateJwk,
                publicKey: exchangePublicJwk,
            },
        };
    },

    async importKeys(
        writeName: string,
        exchangeName: string,
        exportedKeys: ExportedKeypairs,
    ): Promise<InMemoryKeyStore> {
        const [writePrivate, writePublic, exchangePrivate, exchangePublic] =
            await Promise.all([
                crypto.subtle.importKey(
                    "jwk",
                    exportedKeys.write.privateKey,
                    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                    true,
                    ["sign"],
                ),
                crypto.subtle.importKey(
                    "jwk",
                    exportedKeys.write.publicKey,
                    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                    true,
                    ["verify"],
                ),
                crypto.subtle.importKey(
                    "jwk",
                    exportedKeys.exchange.privateKey,
                    { name: "RSA-OAEP", hash: "SHA-256" },
                    true,
                    ["decrypt"],
                ),
                crypto.subtle.importKey(
                    "jwk",
                    exportedKeys.exchange.publicKey,
                    { name: "RSA-OAEP", hash: "SHA-256" },
                    true,
                    ["encrypt"],
                ),
            ]);

        keypairStore.set(writeName, {
            privateKey: writePrivate,
            publicKey: writePublic,
        });

        keypairStore.set(exchangeName, {
            privateKey: exchangePrivate,
            publicKey: exchangePublic,
        });

        return this;
    },

    async exportSymmKey(name: string): Promise<Uint8Array> {
        const key = symmKeyStore.get(name);
        if (!key) {
            throw new Error(`Symmetric key not found: ${name}`);
        }
        const raw = await crypto.subtle.exportKey("raw", key);
        return new Uint8Array(raw);
    },

    async importSymmKey(key: Uint8Array, name: string): Promise<void> {
        const importedKey = await crypto.subtle.importKey(
            "raw",
            new Uint8Array(key),
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"],
        );
        symmKeyStore.set(name, importedKey);
    },

    async symmKeyExists(name: string): Promise<boolean> {
        return symmKeyStore.has(name);
    },

    // Configuration object to match RSAKeyStore interface
    cfg: {
        charSize: 8,
        hashAlg: "SHA-256",
        storeName: "memory-keystore",
    },
};
