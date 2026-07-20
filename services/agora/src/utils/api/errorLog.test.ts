import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { getErrorLogContext } from "./errorLog";

describe("getErrorLogContext", () => {
  it("omits Axios request configuration and authorization headers", () => {
    const error = new AxiosError("Network Error", AxiosError.ERR_NETWORK, {
      headers: new AxiosHeaders({ Authorization: "secret-ucan" }),
    });

    const context = getErrorLogContext(error);

    expect(context).toEqual({
      name: "AxiosError",
      message: "Network Error",
      stack: error.stack,
      axiosCode: AxiosError.ERR_NETWORK,
      httpStatus: undefined,
    });
    expect(JSON.stringify(context)).not.toContain("secret-ucan");
  });
});
