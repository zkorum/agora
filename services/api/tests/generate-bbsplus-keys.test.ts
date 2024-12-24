import fs from "fs";
import { beforeAll, describe, test } from "@jest/globals";
import {
    initializeWasm,
    BBSPlusSignatureParamsG1 as SignatureParams,
    BBSPlusKeypairG2 as KeyPair,
} from "@docknetwork/crypto-wasm-ts";
// see https://nodejs.org/api/crypto.html for reasons behind dynamic ESM import
type CryptoModule = typeof import("node:crypto");
let crypto: CryptoModule;
try {
    crypto = await import("node:crypto");
} catch (err) {
    console.error("crypto support is disabled!");
    console.error(err);
}

const describeOrSkip =
    process.env.GENERATE_DEV_KEYS === "true" ? describe : describe.skip;

describeOrSkip(
    "not really a test: actually generate bbs plus keys in a file for development purpose - usually skipped",
    () => {
        beforeAll(async () => {
            await initializeWasm();
        });
        test("generate-dev-keys", () => {
            const params = SignatureParams.generate(100);
            const randomBytes = new Uint8Array(32);
            crypto.webcrypto.getRandomValues(randomBytes);
            const keypair = KeyPair.generate(params, randomBytes);
            const sk = keypair.secretKey;
            const pk = keypair.publicKey;
            fs.writeFileSync("./private.dev.key", sk.hex);
            fs.writeFileSync("./public.dev.key", pk.hex);
        });
    },
);
