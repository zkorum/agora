import * as ucans from "@ucans/ucans";
import localforage from "localforage";
import { Dto } from "src/shared/types/dto";
import {
  httpMethodToAbility,
  httpPathnameToResourcePointer,
} from "src/shared-app-api/ucan/ucan";
import { processEnv } from "src/utils/processEnv";
import { z } from "zod";

import { WEB_CRYPTO_STORE_NAME, withWebCryptoStore } from "../crypto/store";
import * as DID from "../crypto/ucan/did/index";
import { readExistingSigningKeyPair } from "../crypto/ucan/implementation/browser";
import { PREFIXED_KEY } from "../crypto/ucan/operation";

// Separate from ordinary auth storage so deletion/logout cannot erase guest proof.
const recoveryStore = localforage.createInstance({
  name: "agora-guest-recovery",
  // CryptoKey handles require structured cloning; JSON/localStorage fallback loses them.
  driver: localforage.INDEXEDDB,
});
const recordSchema = z.object({
  didWrite: z.string(),
  expiresAt: z.number(),
  keyPair: z.object({
    privateKey: z.instanceof(CryptoKey),
    publicKey: z.instanceof(CryptoKey),
  }),
});

export async function preserveGuestRecoveryKey(): Promise<void> {
  await withWebCryptoStore(async (store) => {
    const didWrite = await DID.write(store, PREFIXED_KEY);
    const keyPair = await readExistingSigningKeyPair({
      storeName: WEB_CRYPTO_STORE_NAME,
      prefixedKey: PREFIXED_KEY,
    });
    await recoveryStore.setItem("proof", {
      didWrite,
      keyPair,
      expiresAt: Date.now() + 15 * 86_400_000,
    });
  });
}

export async function clearGuestRecoveryKey(): Promise<void> {
  await recoveryStore.removeItem("proof");
}

async function readGuestRecoveryKey() {
  const parsed = recordSchema.safeParse(
    await recoveryStore.getItem<unknown>("proof")
  );
  if (!parsed.success || parsed.data.expiresAt <= Date.now()) {
    await clearGuestRecoveryKey();
    return undefined;
  }
  return parsed.data;
}

export async function hasGuestRecoveryKey(): Promise<boolean> {
  return (await readGuestRecoveryKey()) !== undefined;
}

export async function buildGuestRecoveryUcan({
  pathname,
  freshDidWrite,
}: {
  pathname: string;
  freshDidWrite: string;
}): Promise<string> {
  const record = await readGuestRecoveryKey();
  if (record === undefined) throw new Error("Guest recovery key unavailable");
  const token = await ucans.Builder.create()
    .issuedBy({
      did: () => record.didWrite,
      jwtAlg: "RS256",
      sign: async (message: Uint8Array) =>
        new Uint8Array(
          await crypto.subtle.sign(
            "RSASSA-PKCS1-v1_5",
            record.keyPair.privateKey,
            new Uint8Array(message)
          )
        ),
    })
    .toAudience(processEnv.VITE_BACK_DID)
    .withLifetimeInSeconds(30)
    .withNonce()
    .withFact(
      Dto.recoverGuestAccountAuthorization.parse({
        action: "recover_guest_account",
        freshDidWrite,
      })
    )
    .claimCapability({
      with: httpPathnameToResourcePointer(pathname),
      can: httpMethodToAbility("POST"),
    })
    .build();
  return ucans.encode(token);
}
