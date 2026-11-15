import { isAxiosError } from "axios";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import {
  type DeviceLoginStatus,
  zodDeviceLoginStatus,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
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
  isCurrent: () => boolean;
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
  isCurrent: () => boolean;
}> {
  const auth = useAuthenticationStore();
  const revision = auth.statusRevision;
  const { url, options } =
    await DefaultApiAxiosParamCreator().apiV1AuthCheckLoginStatusPost();
  const signed = await buildUcanForRequestWithDid({
    pathname: url,
    method: options.method,
  });
  return { ...signed, isCurrent: () => auth.statusRevision === revision };
}

export async function requestBackendDeviceLoginStatus(): Promise<BackendDeviceLoginStatus> {
  const { didWrite, encodedUcan, isCurrent } = await buildBackendAuthRequest();
  return {
    didWrite,
    loginStatus: await requestDeviceLoginStatus({ encodedUcan }),
    isCurrent,
  };
}

export async function requestBackendAuthStatus(): Promise<BackendDeviceLoginStatus> {
  const { didWrite, encodedUcan, isCurrent } = await buildBackendAuthRequest();
  try {
    return {
      didWrite,
      loginStatus: await requestDeviceLoginStatus({ encodedUcan }),
      isCurrent,
    };
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 401) {
      throw error;
    }

    return { didWrite, loginStatus: unknownDeviceLoginStatus, isCurrent };
  }
}

async function applyRefreshedAuthState({
  loginStatus,
  didWrite,
  isCurrent,
}: {
  loginStatus: DeviceLoginStatus;
  didWrite: string;
  isCurrent: () => boolean;
}): Promise<AuthStateRefreshResult> {
  const application = await applyBackendAuthStatus({
    loginStatus,
    didWrite,
    isCurrent,
  });
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
  const { loginStatus, didWrite, isCurrent } = await requestBackendAuthStatus();
  return await applyRefreshedAuthState({ loginStatus, didWrite, isCurrent });
}
