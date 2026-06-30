const safeProjectHrefProtocols = ["http:", "https:", "mailto:"];
const safeProjectWebHrefProtocols = ["http:", "https:"];

export function getSafeProjectHref(href: string): string | undefined {
  return getSafeProjectHrefWithProtocols({
    href,
    allowedProtocols: safeProjectHrefProtocols,
  });
}

export function getSafeProjectWebHref(href: string): string | undefined {
  return getSafeProjectHrefWithProtocols({
    href,
    allowedProtocols: safeProjectWebHrefProtocols,
  });
}

function getSafeProjectHrefWithProtocols({
  href,
  allowedProtocols,
}: {
  href: string;
  allowedProtocols: readonly string[];
}): string | undefined {
  const trimmedHref = href.trim();
  if (trimmedHref.length === 0 || hasControlCharacter(trimmedHref)) {
    return undefined;
  }

  if (trimmedHref.startsWith("/") && !trimmedHref.startsWith("//")) {
    return trimmedHref;
  }

  try {
    const parsedUrl = new URL(trimmedHref);
    return allowedProtocols.includes(parsedUrl.protocol) ? trimmedHref : undefined;
  } catch {
    return undefined;
  }
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const characterCode = value.charCodeAt(index);
    if (characterCode <= 31 || characterCode === 127) return true;
  }

  return false;
}
