interface Window {
  plausible?: {
    (eventName: "pageview"): void;
    init(options?: {
      autoCapturePageviews?: boolean;
      transformRequest?: (payload: unknown) => unknown;
    }): void;
    q?: unknown[][];
    o?: unknown;
  };
}
