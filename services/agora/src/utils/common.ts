import { Platform } from "quasar";
import { z } from "zod";

export function getDateString(dateObject: Date) {
  return dateObject.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function zeroIfUndefined(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }
  return value;
}

export function getTrimmedPseudonym(pseudo: string) {
  return pseudo.substring(0, 7);
}

export async function persistData(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    return await navigator.storage.persist();
  } else {
    console.warn("The browser does not support persistence");
    return false;
  }
}

export async function isDataPersisted(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persisted) {
    return await navigator.storage.persisted();
  } else {
    console.warn("The browser does not support persistence");
    return false;
  }
}

const suportedPlatforms = z.enum(["mobile", "web"]);
export type SupportedPlatform = z.infer<typeof suportedPlatforms>;

export function getPlatform(platform: Platform): SupportedPlatform {
  if (platform.is.nativeMobile) {
    return "mobile";
  }
  if (!platform.is.desktop && !platform.is.bex) {
    return "web";
  }
  // TODO: throw warning
  console.warn("This platform is not supported");
  return "web";
}
