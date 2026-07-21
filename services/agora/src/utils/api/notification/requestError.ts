import { isAxiosError } from "axios";

import { isCancellationError, isNetworkError, isTimeoutError } from "../common";
import { getErrorLogContext } from "../errorLog";

function isExpectedNotificationRequestError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  // The response interceptor refreshes auth after 401, but does not replay the request.
  if (error.response?.status === 401) {
    return true;
  }

  return (
    isNetworkError(error.code) ||
    isTimeoutError(error.code) ||
    isCancellationError(error.code)
  );
}

export function handleNotificationRequestError({
  error,
  operation,
}: {
  error: unknown;
  operation: string;
}): void {
  if (!isExpectedNotificationRequestError(error)) {
    throw error;
  }

  console.warn(operation, getErrorLogContext(error));
}

export async function runNotificationRefreshInBackground(
  refreshNotifications: () => Promise<void>
): Promise<void> {
  try {
    await refreshNotifications();
  } catch (error) {
    handleNotificationRequestError({
      error,
      operation: "Background notification refresh failed",
    });
  }
}
