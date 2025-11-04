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

    async exportKeys(writeName: string, exchangeName: string): Promise<{
        write: { privateKey: JsonWebKey; publicKey: JsonWebKey };
        exchange: { privateKey: JsonWebKey; publicKey: JsonWebKey };
    }> {
        const writeKeypair = keypairStore.get(writeName);
        const exchangeKeypair = keypairStore.get(exchangeName);

        if (!writeKeypair || !exchangeKeypair) {
            throw new Error(`Keys not found: ${writeName} or ${exchangeName}`);
        }

        const [writePrivateJwk, writePublicJwk, exchangePrivateJwk, exchangePublicJwk] = await Promise.all([
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
        exportedKeys: {
            write: { privateKey: JsonWebKey; publicKey: JsonWebKey };
            exchange: { privateKey: JsonWebKey; publicKey: JsonWebKey };
        }
    ): Promise<typeof MemoryKeyStore> {
        const [writePrivate, writePublic, exchangePrivate, exchangePublic] = await Promise.all([
            crypto.subtle.importKey(
                "jwk",
                exportedKeys.write.privateKey,
                { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                true,
                ["sign"]
            ),
            crypto.subtle.importKey(
                "jwk",
                exportedKeys.write.publicKey,
                { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                true,
                ["verify"]
            ),
            crypto.subtle.importKey(
                "jwk",
                exportedKeys.exchange.privateKey,
                { name: "RSA-OAEP", hash: "SHA-256" },
                true,
                ["decrypt"]
            ),
            crypto.subtle.importKey(
                "jwk",
                exportedKeys.exchange.publicKey,
                { name: "RSA-OAEP", hash: "SHA-256" },
                true,
                ["encrypt"]
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

    // Configuration object to match RSAKeyStore interface
    cfg: {
        charSize: 8,
        hashAlg: "SHA-256",
        storeName: "memory-keystore",
    },
};
