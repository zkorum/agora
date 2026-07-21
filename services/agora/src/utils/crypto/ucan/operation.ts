import * as ucans from "@ucans/ucans";
import {
  httpMethodToAbility,
  httpPathnameToResourcePointer,
} from "src/shared-app-api/ucan/ucan";
import { processEnv } from "src/utils/processEnv";

import { clearWebCryptoStore, withWebCryptoStore } from "../store";
import * as DID from "./did/index";
import type { Implementation } from "./implementation";

interface CreateDidReturn {
  did: string;
  prefixedKey: string;
}

export type KeyAction = "overwrite" | "get" | "create";

const PREFIXED_KEY = "com.zkorum.agora/v1/sign";

async function getDidForKeyAction({
  cryptoStore,
  keyAction,
}: {
  cryptoStore: Implementation;
  keyAction: KeyAction;
}): Promise<CreateDidReturn> {
  const prefixedKey = PREFIXED_KEY;
  switch (keyAction) {
    case "create": {
      // Do not silently mint a new DID on local keystore errors. The backend's
      // check-login-status response is the source of truth for clearing auth state.
      await cryptoStore.keystore.createIfDoesNotExists(prefixedKey);
      break;
    }
    case "overwrite": {
      await cryptoStore.keystore.createOverwriteIfAlreadyExists(prefixedKey);
      break;
    }
    case "get": {
      break;
    }
  }
  const did = await DID.write(cryptoStore, prefixedKey);
  return { did, prefixedKey };
}

export async function createDidIfDoesNotExist(): Promise<CreateDidReturn> {
  return await withWebCryptoStore(async (cryptoStore) =>
    getDidForKeyAction({ cryptoStore, keyAction: "create" })
  );
}

export async function deleteDid(): Promise<void> {
  await clearWebCryptoStore();
}

// Default UCAN lifetime for standard API calls (30 seconds)
const DEFAULT_UCAN_LIFETIME_SECONDS = 30;

// Extended UCAN lifetime for file uploads (2 minutes)
export const FILE_UPLOAD_UCAN_LIFETIME_SECONDS = 120;

interface BuildUcanForRequestProps {
  keyAction?: KeyAction;
  pathname: string;
  method: string | undefined;
  lifetimeInSeconds?: number;
}

interface BuildUcanProps extends Omit<BuildUcanForRequestProps, "keyAction"> {
  cryptoStore: Implementation;
  did: string;
  prefixedKey: string;
}

async function buildUcan({
  cryptoStore,
  did,
  prefixedKey,
  pathname,
  method,
  lifetimeInSeconds = DEFAULT_UCAN_LIFETIME_SECONDS,
}: BuildUcanProps): Promise<string> {
  const u = await ucans.Builder.create()
    .issuedBy({
      did: () => did,
      jwtAlg: await cryptoStore.keystore.getUcanAlgorithm(),
      sign: async (msg: Uint8Array) =>
        cryptoStore.keystore.sign(msg, prefixedKey),
    })
    .toAudience(processEnv.VITE_BACK_DID)
    .withLifetimeInSeconds(lifetimeInSeconds)
    .withNonce()
    .claimCapability({
      with: httpPathnameToResourcePointer(pathname),
      can: httpMethodToAbility(method !== undefined ? method : "POST"),
    })
    .build();
  const encodedUcan = ucans.encode(u);
  return encodedUcan;
}

export async function buildUcanForRequest({
  keyAction = "create",
  pathname,
  method,
  lifetimeInSeconds = DEFAULT_UCAN_LIFETIME_SECONDS,
}: BuildUcanForRequestProps): Promise<string> {
  return await withWebCryptoStore(async (cryptoStore) => {
    const { did, prefixedKey } = await getDidForKeyAction({
      cryptoStore,
      keyAction,
    });
    return await buildUcan({
      cryptoStore,
      did,
      prefixedKey,
      pathname,
      method,
      lifetimeInSeconds,
    });
  });
}

export function buildAuthorizationHeader(encodedUcan: string) {
  return {
    Authorization: `Bearer ${encodedUcan}`,
  };
}
