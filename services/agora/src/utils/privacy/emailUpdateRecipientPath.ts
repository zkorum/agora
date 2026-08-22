export const emailUpdateRecipientActionPurposes = [
  "unsubscribe",
  "preferences",
  "report",
] as const;

export type EmailUpdateRecipientActionPurpose =
  (typeof emailUpdateRecipientActionPurposes)[number];

const RECIPIENT_ACTION_PATH =
  /^\/email-updates\/(unsubscribe|preferences|report)\/[^/?#]+\/?$/;
const RECIPIENT_ACTION_URL_IN_TEXT =
  /(?:https?:\/\/[^\s"'<>/]+)?\/email-updates\/(unsubscribe|preferences|report)\/[^/?#\s"'<>]+\/?(?:[?#][^\s"'<>]*)?/gi;

export function getEmailUpdateRecipientActionPurpose(
  pathname: string
): EmailUpdateRecipientActionPurpose | undefined {
  const match = RECIPIENT_ACTION_PATH.exec(pathname);
  const purpose = match?.[1];
  return emailUpdateRecipientActionPurposes.find(
    (candidate) => candidate === purpose
  );
}

export function isEmailUpdateRecipientActionPath(pathname: string): boolean {
  return getEmailUpdateRecipientActionPurpose(pathname) !== undefined;
}

export function shouldReloadForEmailUpdateRecipientAction({
  currentPathname,
  targetPathname,
}: {
  currentPathname: string;
  targetPathname: string;
}): boolean {
  return (
    isEmailUpdateRecipientActionPath(currentPathname) !==
    isEmailUpdateRecipientActionPath(targetPathname)
  );
}

export function containsEmailUpdateRecipientActionPath(
  value: unknown
): boolean {
  return containsRecipientActionPath({ value, seen: new WeakSet() });
}

export function redactEmailUpdateRecipientActionPaths(value: string): string {
  return value.replace(
    RECIPIENT_ACTION_URL_IN_TEXT,
    (_match, purpose: string) =>
      `/email-updates/${purpose.toLowerCase()}/[redacted]`
  );
}

function containsRecipientActionPath({
  value,
  seen,
}: {
  value: unknown;
  seen: WeakSet<object>;
}): boolean {
  if (typeof value === "string") {
    RECIPIENT_ACTION_URL_IN_TEXT.lastIndex = 0;
    return RECIPIENT_ACTION_URL_IN_TEXT.test(value);
  }
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return false;
  }

  seen.add(value);
  try {
    return Object.values(Object.getOwnPropertyDescriptors(value)).some(
      (descriptor) =>
        !("value" in descriptor) ||
        containsRecipientActionPath({ value: descriptor.value, seen })
    );
  } catch {
    // Telemetry privacy checks fail closed for exotic host objects or proxies.
    return true;
  }
}
