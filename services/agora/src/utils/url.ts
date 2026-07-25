import { zodHttpsUrl } from "src/shared/types/zod";

export function isHttpsUrl(value: string): boolean {
  return zodHttpsUrl.safeParse(value.trim()).success;
}

export function isOptionalHttpsUrl(value: string): boolean {
  return value.trim() === "" || isHttpsUrl(value);
}
