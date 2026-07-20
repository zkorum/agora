import { isAxiosError } from "axios";

interface ErrorLogContext {
  name: string;
  message: string;
  stack: string | undefined;
  axiosCode: string | undefined;
  httpStatus: number | undefined;
}

export function getErrorLogContext(error: unknown): ErrorLogContext {
  if (isAxiosError(error)) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      axiosCode: error.code,
      httpStatus: error.response?.status,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      axiosCode: undefined,
      httpStatus: undefined,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
    stack: undefined,
    axiosCode: undefined,
    httpStatus: undefined,
  };
}
