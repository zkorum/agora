import { zodHttpsUrl } from "src/shared/types/zod";

export function getSafeProjectHref(href: string): string | undefined {
  const trimmedHref = href.trim();
  if (trimmedHref.length === 0 || hasControlCharacter(trimmedHref)) {
    return undefined;
  }

  if (trimmedHref.startsWith("/") && !trimmedHref.startsWith("//")) {
    return trimmedHref;
  }

  const webUrl = zodHttpsUrl.safeParse(trimmedHref);
  if (webUrl.success) {
    return webUrl.data;
  }

  try {
    const parsedUrl = new URL(trimmedHref);
    return parsedUrl.protocol === "mailto:" ? trimmedHref : undefined;
  } catch {
    return undefined;
  }
}

export function getSafeProjectWebHref(href: string): string | undefined {
  const trimmedHref = href.trim();
  if (hasControlCharacter(trimmedHref)) {
    return undefined;
  }

  const result = zodHttpsUrl.safeParse(trimmedHref);
  return result.success ? result.data : undefined;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const characterCode = value.charCodeAt(index);
    if (characterCode <= 31 || characterCode === 127) return true;
  }

  return false;
}
