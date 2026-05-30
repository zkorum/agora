import { logBrowserEvent, serializeBrowserLogValue } from "src/utils/devLogger";

import { defineBoot } from "#q-app/wrappers";

type ConsoleMethodName = "debug" | "info" | "log" | "warn" | "error";

const consoleMethodNames: ConsoleMethodName[] = [
  "debug",
  "info",
  "log",
  "warn",
  "error",
];

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

function firstErrorFromArgs(args: unknown[]): Error | undefined {
  return args.find(isError);
}

function stackFromUnknown(value: unknown): string | undefined {
  return isError(value) ? value.stack : undefined;
}

function stackFromConsoleArgs(args: unknown[]): string | undefined {
  return firstErrorFromArgs(args)?.stack;
}

function valueType(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (isError(value)) {
    return "error";
  }
  return typeof value;
}

function consoleMessage(args: unknown[]): string {
  return args.map(serializeBrowserLogValue).join(" ");
}

export default defineBoot(({ router }) => {
  if (!import.meta.env.DEV) {
    return;
  }

  const originalConsoleMethods: Record<
    ConsoleMethodName,
    (...data: unknown[]) => void
  > = {
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  for (const methodName of consoleMethodNames) {
    console[methodName] = (...data: unknown[]) => {
      originalConsoleMethods[methodName](...data);
      logBrowserEvent({
        level: methodName,
        category: "console",
        message: consoleMessage(data),
        stack: stackFromConsoleArgs(data),
        metadata: {
          argumentCount: data.length,
          argumentTypes: data.map(valueType).join(","),
          firstErrorName: firstErrorFromArgs(data)?.name ?? null,
        },
      });
    };
  }

  window.addEventListener("error", (event) => {
    logBrowserEvent({
      level: "error",
      category: "runtime_error",
      message: event.message,
      stack: stackFromUnknown(event.error),
      metadata: {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logBrowserEvent({
      level: "error",
      category: "unhandled_rejection",
      message: serializeBrowserLogValue(event.reason),
      stack: stackFromUnknown(event.reason),
    });
  });

  router.afterEach((to, from) => {
    logBrowserEvent({
      level: "info",
      category: "navigation",
      message: "route_change",
      metadata: {
        from: from.fullPath,
        to: to.fullPath,
      },
    });
  });
});
