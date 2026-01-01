/* eslint-disable no-case-declarations */
import * as ucans from "@ucans/ucans";
import { SecureSigning } from "@zkorum/capacitor-secure-signing";
import { publicKeyToDid } from "src/shared/did/util";
import { base64Decode, base64Encode } from "src/shared-app-api/base64";
import {
  httpMethodToAbility,
  httpPathnameToResourcePointer,
} from "src/shared-app-api/ucan/ucan";
import { type SupportedPlatform } from "src/utils/common";
import { processEnv } from "src/utils/processEnv";

import { getWebCryptoStore } from "../store";
import * as DID from "./did/index";

interface CreateDidReturn {
  did: string;
  prefixedKey: string;
}

// //TODO: move the web target's code to the Capacitor plugin
export async function createDidIfDoesNotExist(
  platform: SupportedPlatform
): Promise<CreateDidReturn> {
  const prefixedKey = "com.zkorum.agora/v1/sign";

  switch (platform) {
    case "mobile":
      const { publicKey } = await SecureSigning.createKeyPairIfDoesNotExist({
        prefixedKey: prefixedKey,
      });
      const decodedPublicKey = base64Decode(publicKey);
      const didMobile = publicKeyToDid(decodedPublicKey);
      return { did: didMobile, prefixedKey };
    case "web":
      const cryptoStore = await getWebCryptoStore();
      await cryptoStore.keystore.createIfDoesNotExists(prefixedKey);
      const didWeb = await DID.write(cryptoStore, prefixedKey);
      return { did: didWeb, prefixedKey };
  }
}

const PREFIXED_KEY = "com.zkorum.agora/v1/sign";

//TODO: move the web target's code to the Capacitor plugin
export async function createDidOverwriteIfAlreadyExists(
  platform: SupportedPlatform
): Promise<CreateDidReturn> {
  const prefixedKey = PREFIXED_KEY;

  switch (platform) {
    case "mobile":
      const { publicKey } = await SecureSigning.generateKeyPair({
        prefixedKey: prefixedKey,
      });
      const decodedPublicKey = base64Decode(publicKey);
      const didMobile = publicKeyToDid(decodedPublicKey);
      return { did: didMobile, prefixedKey };
    case "web":
      const cryptoStore = await getWebCryptoStore();
      await cryptoStore.keystore.createOverwriteIfAlreadyExists(prefixedKey);
      const didWeb = await DID.write(cryptoStore, prefixedKey);
      return { did: didWeb, prefixedKey };
  }
}

//TODO: move the web target's code to the Capacitor plugin
//TODO: this throws exception in mobile! not sure in web
export async function getDid(
  platform: SupportedPlatform
): Promise<CreateDidReturn> {
  const prefixedKey = PREFIXED_KEY;

  switch (platform) {
    case "mobile":
      // TODO: FIX SecureSigning
      /*
      const { publicKey } = await SecureSigning.getKeyPair({
        prefixedKey: prefixedKey,
      });
      const decodedPublicKey = base64Decode(publicKey);
      const didMobile = publicKeyToDid(decodedPublicKey);
      return { did: didMobile, prefixedKey };
      */
      return { did: "", prefixedKey };
    case "web":
      const cryptoStore = await getWebCryptoStore();
      await cryptoStore.keystore.publicWriteKey(prefixedKey);
      const didWeb = await DID.write(cryptoStore, prefixedKey);
      return { did: didWeb, prefixedKey };
  }
}

//TODO: move the web target's code to the Capacitor plugin
export async function deleteDid(platform: SupportedPlatform): Promise<void> {
  // const prefixedKey = PREFIXED_KEY;

  switch (platform) {
    case "mobile":
      // TODO: test if this actually works:
      // TODO: FIX SecureSigning
      /*
      await SecureSigning.deleteKeyPair({
        prefixedKey: prefixedKey,
      });
      */
      break;
    case "web":
      const cryptoStore = await getWebCryptoStore();
      // TODO: understand why deleteKey(prefixedKey) doesn't work...
      await cryptoStore.keystore.clearStore();
      break;
  }
}
//
// Default UCAN lifetime for standard API calls (30 seconds)
const DEFAULT_UCAN_LIFETIME_SECONDS = 30;

// Extended UCAN lifetime for file uploads (2 minutes)
export const FILE_UPLOAD_UCAN_LIFETIME_SECONDS = 120;

interface CreateUcanProps {
  did: string;
  prefixedKey: string;
  pathname: string;
  method: string | undefined;
  platform: SupportedPlatform;
  lifetimeInSeconds?: number;
}

async function buildWebUcan({
  did,
  prefixedKey,
  pathname,
  method,
  lifetimeInSeconds = DEFAULT_UCAN_LIFETIME_SECONDS,
}: CreateUcanProps): Promise<string> {
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
      // with: { scheme: "wnfs", hierPart: "//boris.fission.name/public/photos/" },
      // can: { namespace: "wnfs", segments: ["OVERWRITE"] },
      with: httpPathnameToResourcePointer(pathname),
      can: httpMethodToAbility(method !== undefined ? method : "POST"),
    })
    .build();
  const encodedUcan = ucans.encode(u);
  return encodedUcan;
}

async function buildMobileUcan({
  did,
  prefixedKey,
  pathname,
  method,
  lifetimeInSeconds = DEFAULT_UCAN_LIFETIME_SECONDS,
}: CreateUcanProps): Promise<string> {
  const u = await ucans.Builder.create()
    .issuedBy({
      did: () => did,
      jwtAlg: "ES256",
      sign: async (msg: Uint8Array) => {
        const { signature } = await SecureSigning.sign({
          prefixedKey: prefixedKey,
          data: base64Encode(msg),
        });
        return base64Decode(signature);
      },
    })
    .toAudience(processEnv.VITE_BACK_DID)
    .withLifetimeInSeconds(lifetimeInSeconds)
    .claimCapability({
      // with: { scheme: "wnfs", hierPart: "//boris.fission.name/public/photos/" },
      // can: { namespace: "wnfs", segments: ["OVERWRITE"] },
      with: httpPathnameToResourcePointer(pathname),
      can: httpMethodToAbility(method !== undefined ? method : "POST"),
    })
    .build();
  const encodedUcan = ucans.encode(u);
  return encodedUcan;
}

export async function buildUcan(props: CreateUcanProps): Promise<string> {
  switch (props.platform) {
    case "web":
      return buildWebUcan(props);
    case "mobile":
      return buildMobileUcan(props);
  }
}

export function buildAuthorizationHeader(encodedUcan: string) {
  return {
    Authorization: `Bearer ${encodedUcan}`,
  };
}
