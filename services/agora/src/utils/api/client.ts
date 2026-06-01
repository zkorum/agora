import axios, { type AxiosError, isAxiosError } from "axios";
import { DefaultApiAxiosParamCreator } from "src/api";
import { processEnv } from "src/utils/processEnv";

// Create axios instances that can be imported
export const axiosInstance = axios;
export const api = axios.create({ baseURL: processEnv.VITE_API_BASE_URL });

let authRefreshAfterUnauthorizedPromise: Promise<void> | undefined;
let authCheckLoginStatusPathnamePromise: Promise<string> | undefined;

function isUnauthorizedAxiosError(error: unknown): error is AxiosError<unknown> {
  return isAxiosError(error) && error.response?.status === 401;
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

async function getAuthCheckLoginStatusPathname(): Promise<string> {
  if (authCheckLoginStatusPathnamePromise !== undefined) {
    return await authCheckLoginStatusPathnamePromise;
  }

  authCheckLoginStatusPathnamePromise = (async () => {
    const { url } =
      await DefaultApiAxiosParamCreator().apiV1AuthCheckLoginStatusPost();
    return new URL(url, processEnv.VITE_API_BASE_URL).pathname;
  })();

  return await authCheckLoginStatusPathnamePromise;
}

async function isAuthCheckLoginStatusRequestUrl(url: string): Promise<boolean> {
  const requestPathname = new URL(url, processEnv.VITE_API_BASE_URL).pathname;
  return requestPathname === (await getAuthCheckLoginStatusPathname());
}

async function shouldRefreshAuthAfterUnauthorized(
  error: unknown
): Promise<boolean> {
  if (!isUnauthorizedAxiosError(error)) {
    return false;
  }

  const requestUrl = error.config?.url;
  return requestUrl === undefined
    ? true
    : !(await isAuthCheckLoginStatusRequestUrl(requestUrl));
}

async function refreshAuthStateAfterUnauthorizedRequest(): Promise<void> {
  if (authRefreshAfterUnauthorizedPromise !== undefined) {
    return await authRefreshAfterUnauthorizedPromise;
  }

  authRefreshAfterUnauthorizedPromise = (async () => {
    try {
      const { refreshAuthStateFromBackend } = await import(
        "src/utils/auth/refreshAuthState"
      );
      await refreshAuthStateFromBackend();
    } catch (error) {
      console.error("Failed to refresh auth state after 401", error);
    } finally {
      authRefreshAfterUnauthorizedPromise = undefined;
    }
  })();

  return await authRefreshAfterUnauthorizedPromise;
}

// Add request interceptor to include Accept-Language header
api.interceptors.request.use(
  (config) => {
    // Get display language from localStorage (same key used by useLanguageStore)
    const displayLanguage = localStorage.getItem("displayLanguage");

    if (displayLanguage) {
      config.headers["Accept-Language"] = displayLanguage;
    }

    // Ensure POST requests always have Content-Type set.
    // The generated API client omits Content-Type for bodyless POST endpoints,
    // which causes Fastify v5 to return 415 Unsupported Media Type.
    if (config.method === "post" && !config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  function (error: unknown) {
    // Do something with request error
    return Promise.reject(toError(error));
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (await shouldRefreshAuthAfterUnauthorized(error)) {
      await refreshAuthStateAfterUnauthorizedRequest();
    }

    return Promise.reject(toError(error));
  }
);
