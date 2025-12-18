import type { ApiV1AuthTicketVerifyPost200Response } from "src/api";
import { DefaultApiAxiosParamCreator,DefaultApiFactory } from "src/api";
import type { EventSlug } from "src/shared/types/zod";

import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { api } from "./client";
import { useCommonApi } from "./common";

export interface VerifyTicketParams {
  proof: unknown;
  eventSlug: EventSlug;
}

export function useBackendZupassApi() {
  const { buildEncodedUcan } = useCommonApi();

  /**
   * Verify a Zupass event ticket GPC proof with the backend
   * Creates a DID if one doesn't exist (allows unauthenticated users)
   */
  async function verifyEventTicket({
    proof,
    eventSlug,
  }: VerifyTicketParams): Promise<ApiV1AuthTicketVerifyPost200Response> {
    const params = {
      proof,
      eventSlug,
    };

    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthTicketVerifyPost(params);
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthTicketVerifyPost(params, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });

    return response.data;
  }

  return { verifyEventTicket };
}
