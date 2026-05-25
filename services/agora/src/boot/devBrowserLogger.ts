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

function stackFromUnknown(value: unknown): string | undefined {
  return value instanceof Error ? value.stack : undefined;
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
        stack: stackFromUnknown(data[0]),
        metadata: {
          argumentCount: data.length,
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
