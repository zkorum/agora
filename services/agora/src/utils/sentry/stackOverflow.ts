import type { Exception } from "@sentry/vue";

const MAXIMUM_CALL_STACK_ERROR = /^Maximum call stack size exceeded\.?$/;

export function isMaximumCallStackException(exception: Exception): boolean {
  return (
    exception.type === "RangeError" &&
    exception.value !== undefined &&
    MAXIMUM_CALL_STACK_ERROR.test(exception.value)
  );
}
