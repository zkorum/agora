/**
 * In-memory keystore for k6 load testing
 * Replaces IndexedDB-based keystore with a simple in-memory Map
 */

// Simple in-memory storage for RSA keypairs
const keypairStore = new Map<string, CryptoKeyPair>();

export const MemoryKeyStore = {
    async init() {
        return this;
    },

    async clear(): Promise<void> {
        keypairStore.clear();
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

    async createIfDoesNotExist(writeName: string, exchangeName: string): Promise<typeof MemoryKeyStore> {
        if (!keypairStore.has(writeName)) {
            const writeKeypair = await crypto.subtle.generateKey(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: { name: "SHA-256" },
                },
                true,
                ["sign", "verify"]
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
                ["encrypt", "decrypt"]
            );
            keypairStore.set(exchangeName, exchangeKeypair);
        }

        return this;
    },

    // Configuration object to match RSAKeyStore interface
    cfg: {
        charSize: 8,
        hashAlg: "SHA-256",
        storeName: "memory-keystore",
    },
};
