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
  buildUcanForRequest,
} from "src/utils/crypto/ucan/operation";

import { resetLocalAuthState } from "./localAuthState";

export interface AuthStateRefreshResult {
  authStateChanged: boolean;
  needsCacheRefresh: boolean;
}

const unknownDeviceLoginStatus = {
  isKnown: false,
  isLoggedIn: false,
  isRegistered: false,
  credentials: { email: null, phone: null, rarimo: null },
} satisfies DeviceLoginStatus;

async function buildEncodedUcanForGeneratedRequest({
  url,
  method,
}: {
  url: string;
  method: string | undefined;
}): Promise<string> {
  return await buildUcanForRequest({
    pathname: url,
    method,
  });
}

async function getDeviceLoginStatus(): Promise<DeviceLoginStatus> {
  const { url, options } =
    await DefaultApiAxiosParamCreator().apiV1AuthCheckLoginStatusPost();
  const encodedUcan = await buildEncodedUcanForGeneratedRequest({
    url,
    method: options.method,
  });
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

async function applyRefreshedAuthState({
  loginStatus,
}: {
  loginStatus: DeviceLoginStatus;
}): Promise<AuthStateRefreshResult> {
  const authStore = useAuthenticationStore();
  const {
    oldLoginStatus,
    newLoginStatus,
    oldIsGuestOrLoggedIn,
    newIsGuestOrLoggedIn,
  } = authStore.setLoginStatus(loginStatus);

  const oldUserId = oldLoginStatus.isKnown ? oldLoginStatus.userId : undefined;
  const newUserId = newLoginStatus.isKnown ? newLoginStatus.userId : undefined;
  const authStateChanged =
    oldIsGuestOrLoggedIn !== newIsGuestOrLoggedIn || oldUserId !== newUserId;

  if (!newLoginStatus.isKnown) {
    await resetLocalAuthState({
      shouldClearLanguagePreferences:
        oldIsGuestOrLoggedIn && !newIsGuestOrLoggedIn,
    });
    return { authStateChanged: true, needsCacheRefresh: false };
  }

  return { authStateChanged, needsCacheRefresh: authStateChanged };
}

export async function refreshAuthStateFromBackend(): Promise<AuthStateRefreshResult> {
  try {
    const loginStatus = await getDeviceLoginStatus();
    return await applyRefreshedAuthState({ loginStatus });
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      return await applyRefreshedAuthState({
        loginStatus: unknownDeviceLoginStatus,
      });
    }

    throw error;
  }
}
