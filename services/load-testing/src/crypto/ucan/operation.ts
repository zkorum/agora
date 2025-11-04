import { getNodeCryptoStore } from "../store.js";
import * as DID from "./did/index.js";
import * as ucans from "@ucans/ucans";

interface CreateDidReturn {
  did: string;
  prefixedKey: string;
}

const PREFIXED_KEY = "com.zkorum.agora/v1/sign";

export async function createDidIfDoesNotExist(uniqueId?: string): Promise<CreateDidReturn> {
  // For load testing, each virtual user needs a unique key
  // If uniqueId is provided, append it to the key to ensure uniqueness
  const prefixedKey = uniqueId
    ? `${PREFIXED_KEY}/${uniqueId}`
    : PREFIXED_KEY;

  const cryptoStore = await getNodeCryptoStore();
  await cryptoStore.keystore.createIfDoesNotExists(prefixedKey);
  const did = await DID.write(cryptoStore, prefixedKey);
  return { did, prefixedKey };
}

export async function createDidOverwriteIfAlreadyExists(uniqueId?: string): Promise<CreateDidReturn> {
  const prefixedKey = uniqueId
    ? `${PREFIXED_KEY}/${uniqueId}`
    : PREFIXED_KEY;

  const cryptoStore = await getNodeCryptoStore();
  await cryptoStore.keystore.createOverwriteIfAlreadyExists(prefixedKey);
  const did = await DID.write(cryptoStore, prefixedKey);
  return { did, prefixedKey };
}

export async function getDid(): Promise<CreateDidReturn> {
  const prefixedKey = PREFIXED_KEY;
  const cryptoStore = await getNodeCryptoStore();
  await cryptoStore.keystore.publicWriteKey(prefixedKey);
  const did = await DID.write(cryptoStore, prefixedKey);
  return { did, prefixedKey };
}

export async function deleteDid(): Promise<void> {
  const cryptoStore = await getNodeCryptoStore();
  await cryptoStore.keystore.clearStore();
}

interface CreateUcanProps {
  did: string;
  prefixedKey: string;
  pathname: string;
  method: string | undefined;
  backendDid: string;
}

export async function buildUcan({
  did,
  prefixedKey,
  pathname,
  method,
  backendDid,
}: CreateUcanProps): Promise<string> {
  const cryptoStore = await getNodeCryptoStore();

  // Convert pathname to resource pointer
  // Must include the domain in hierPart format: //domain.com/path
  const resourcePointer = {
    scheme: "https",
    hierPart: `//agoracitizen.app${pathname}`,
  };

  // Convert HTTP method to UCAN ability
  const ability = {
    namespace: "http",
    segments: [method !== undefined ? method.toUpperCase() : "POST"],
  };

  const u = await ucans.Builder.create()
    .issuedBy({
      did: () => did,
      jwtAlg: await cryptoStore.keystore.getUcanAlgorithm(),
      sign: async (msg: Uint8Array) =>
        cryptoStore.keystore.sign(msg, prefixedKey),
    })
    .toAudience(backendDid)
    .withLifetimeInSeconds(30)
    .claimCapability({
      with: resourcePointer,
      can: ability,
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

export interface ExportedKeys {
  write: { privateKey: JsonWebKey; publicKey: JsonWebKey };
  exchange: { privateKey: JsonWebKey; publicKey: JsonWebKey };
}

export async function exportKeys(prefixedKey: string): Promise<ExportedKeys> {
  const cryptoStore = await getNodeCryptoStore();
  const writeName = `${prefixedKey}/write`;
  const exchangeName = `${prefixedKey}/exchange`;
  return await cryptoStore.keystore.exportKeys(writeName, exchangeName);
}

export async function importKeys(prefixedKey: string, exportedKeys: ExportedKeys): Promise<void> {
  const cryptoStore = await getNodeCryptoStore();
  const writeName = `${prefixedKey}/write`;
  const exchangeName = `${prefixedKey}/exchange`;
  await cryptoStore.keystore.importKeys(writeName, exchangeName, exportedKeys);
}
