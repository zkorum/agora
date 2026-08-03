import { isAxiosError } from "axios";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import {
  type DeviceLoginStatus,
  zodDeviceLoginStatus,
} from "src/shared/types/zod";
import { api } from "src/utils/api/client";
import {
  buildAuthorizationHeader,
  buildUcanForRequestWithDid,
} from "src/utils/crypto/ucan/operation";

import { applyBackendAuthStatus } from "./backendAuthState";
import { clearAccountScopedState } from "./localAuthState";

export interface AuthStateRefreshResult {
  authStateChanged: boolean;
  needsCacheRefresh: boolean;
}

export interface BackendDeviceLoginStatus {
  didWrite: string;
  loginStatus: DeviceLoginStatus;
}

const unknownDeviceLoginStatus = {
  isKnown: false,
  isLoggedIn: false,
  isRegistered: false,
  credentials: { email: null, phone: null, rarimo: null },
} satisfies DeviceLoginStatus;

async function requestDeviceLoginStatus({
  encodedUcan,
}: {
  encodedUcan: string;
}): Promise<DeviceLoginStatus> {
  const response = await DefaultApiFactory(
    undefined,
    undefined,
    api
  ).apiV1AuthCheckLoginStatusPost({
    headers: {
      ...buildAuthorizationHeader(encodedUcan),
    },
  });

  return zodDeviceLoginStatus.parse(response.data.loggedInStatus);
}

async function buildBackendAuthRequest(): Promise<{
  didWrite: string;
  encodedUcan: string;
}> {
  const { url, options } =
    await DefaultApiAxiosParamCreator().apiV1AuthCheckLoginStatusPost();
  return await buildUcanForRequestWithDid({
    pathname: url,
    method: options.method,
  });
}

export async function requestBackendDeviceLoginStatus(): Promise<BackendDeviceLoginStatus> {
  const { didWrite, encodedUcan } = await buildBackendAuthRequest();
  return {
    didWrite,
    loginStatus: await requestDeviceLoginStatus({ encodedUcan }),
  };
}

export async function requestBackendAuthStatus(): Promise<BackendDeviceLoginStatus> {
  const { didWrite, encodedUcan } = await buildBackendAuthRequest();
  try {
    return {
      didWrite,
      loginStatus: await requestDeviceLoginStatus({ encodedUcan }),
    };
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 401) {
      throw error;
    }

    return { didWrite, loginStatus: unknownDeviceLoginStatus };
  }
}

async function applyRefreshedAuthState({
  loginStatus,
  didWrite,
}: {
  loginStatus: DeviceLoginStatus;
  didWrite: string;
}): Promise<AuthStateRefreshResult> {
  const application = await applyBackendAuthStatus({ loginStatus, didWrite });
  if (application.type === "ignored") {
    return { authStateChanged: false, needsCacheRefresh: false };
  }
  if (application.type === "reset") {
    return { authStateChanged: true, needsCacheRefresh: false };
  }
  const {
    oldLoginStatus,
    newLoginStatus,
    oldIsGuestOrLoggedIn,
    newIsGuestOrLoggedIn,
  } = application.transition;

  const oldUserId = oldLoginStatus.isKnown ? oldLoginStatus.userId : undefined;
  const newUserId = newLoginStatus.isKnown ? newLoginStatus.userId : undefined;
  const authStateChanged =
    oldIsGuestOrLoggedIn !== newIsGuestOrLoggedIn || oldUserId !== newUserId;
  const knownUserChanged =
    oldLoginStatus.isKnown && newLoginStatus.isKnown && oldUserId !== newUserId;

  if (knownUserChanged) {
    clearAccountScopedState();
  }

  return { authStateChanged, needsCacheRefresh: authStateChanged };
}

export async function refreshAuthStateFromBackend(): Promise<AuthStateRefreshResult> {
  const { loginStatus, didWrite } = await requestBackendAuthStatus();
  return await applyRefreshedAuthState({ loginStatus, didWrite });
}
