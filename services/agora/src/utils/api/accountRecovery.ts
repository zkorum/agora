import { Dto } from "src/shared/types/dto";
import {
  buildGuestRecoveryUcan,
  clearGuestRecoveryKey,
} from "src/utils/auth/guestRecoveryKey";

import {
  buildAuthorizationHeader,
  buildUcanForRequestWithDid,
} from "../crypto/ucan/operation";
import { api } from "./client";

export function useAccountRecoveryApi() {
  async function recoverPassportAccount() {
    const path = "/api/v1/user/recover/passport";
    const { encodedUcan } = await buildUcanForRequestWithDid({
      pathname: path,
      method: "POST",
      keyAction: "get",
    });
    const response = await api.post<unknown>(
      path,
      {},
      { headers: buildAuthorizationHeader(encodedUcan) }
    );
    return Dto.verifyUserStatusAndAuthenticate200.parse(response.data);
  }

  async function recoverGuestAccount() {
    const path = "/api/v1/user/recover/guest";
    // Mint the new key once when entering recovery, not on retries after a lost response.
    const { didWrite } = await buildUcanForRequestWithDid({
      pathname: path,
      method: "POST",
      keyAction: "get",
    });
    const encodedUcan = await buildGuestRecoveryUcan({
      pathname: path,
      freshDidWrite: didWrite,
    });
    const response = await api.post<unknown>(
      path,
      Dto.recoverGuestAccountRequest.parse({ freshDidWrite: didWrite }),
      { headers: buildAuthorizationHeader(encodedUcan) }
    );
    const result = Dto.recoverAccountResponse.parse(response.data);
    if (result.success) await clearGuestRecoveryKey();
    return result;
  }
  return { recoverPassportAccount, recoverGuestAccount };
}
