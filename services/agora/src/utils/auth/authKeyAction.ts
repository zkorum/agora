import type { KeyAction } from "src/utils/crypto/ucan/operation";

export function getAuthenticationStartKeyAction({
  isKnown,
  isRegistered,
  isLoggedIn,
}: {
  isKnown: boolean;
  isRegistered: boolean;
  isLoggedIn: boolean;
}): KeyAction {
  return isKnown && isRegistered && !isLoggedIn ? "overwrite" : "create";
}
