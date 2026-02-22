import {
  httpMethodToAbility,
  httpPathnameToResourcePointer,
} from "src/shared-app-api/ucan/ucan";
import { processEnv } from "src/utils/processEnv";

import { getWebCryptoStore } from "../store";
import * as DID from "./did/index";

interface CreateDidReturn {
  did: string;
  prefixedKey: string;
}

export async function createDidIfDoesNotExist(): Promise<CreateDidReturn> {
  const prefixedKey = "com.zkorum.agora/v1/sign";
  const cryptoStore = await getWebCryptoStore();
  await cryptoStore.keystore.createIfDoesNotExists(prefixedKey);
  const did = await DID.write(cryptoStore, prefixedKey);
  return { did, prefixedKey };
}

const PREFIXED_KEY = "com.zkorum.agora/v1/sign";

export async function createDidOverwriteIfAlreadyExists(): Promise<CreateDidReturn> {
  const prefixedKey = PREFIXED_KEY;
  const cryptoStore = await getWebCryptoStore();
  await cryptoStore.keystore.createOverwriteIfAlreadyExists(prefixedKey);
  const did = await DID.write(cryptoStore, prefixedKey);
  return { did, prefixedKey };
}

export async function getDid(): Promise<CreateDidReturn> {
  const prefixedKey = PREFIXED_KEY;
  const cryptoStore = await getWebCryptoStore();
  await cryptoStore.keystore.publicWriteKey(prefixedKey);
  const did = await DID.write(cryptoStore, prefixedKey);
  return { did, prefixedKey };
}

export async function deleteDid(): Promise<void> {
  const cryptoStore = await getWebCryptoStore();
  // TODO: understand why deleteKey(prefixedKey) doesn't work...
  await cryptoStore.keystore.clearStore();
}

// Default UCAN lifetime for standard API calls (30 seconds)
const DEFAULT_UCAN_LIFETIME_SECONDS = 30;

// Extended UCAN lifetime for file uploads (2 minutes)
export const FILE_UPLOAD_UCAN_LIFETIME_SECONDS = 120;

interface BuildUcanProps {
  did: string;
  prefixedKey: string;
  pathname: string;
  method: string | undefined;
  lifetimeInSeconds?: number;
}

export async function buildUcan({
  did,
  prefixedKey,
  pathname,
  method,
  lifetimeInSeconds = DEFAULT_UCAN_LIFETIME_SECONDS,
}: BuildUcanProps): Promise<string> {
  const ucans = await import("@ucans/ucans");

  const webCryptoStore = await getWebCryptoStore();
  const u = await ucans.Builder.create()
    .issuedBy({
      did: () => did,
      jwtAlg: await webCryptoStore.keystore.getUcanAlgorithm(),
      sign: async (msg: Uint8Array) =>
        webCryptoStore.keystore.sign(msg, prefixedKey),
    })
    .toAudience(processEnv.VITE_BACK_DID)
    .withLifetimeInSeconds(lifetimeInSeconds)
    .claimCapability({
      with: httpPathnameToResourcePointer(pathname),
      can: httpMethodToAbility(method !== undefined ? method : "POST"),
    })
    .build();
  const encodedUcan = ucans.encode(u);
  return encodedUcan;
}

export function buildAuthorizationHeader(encodedUcan: string) {
  return {
    Authorization: `Bearer ${encodedUcan}`,
  };
}
