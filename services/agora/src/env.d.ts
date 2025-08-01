declare namespace NodeJS {
  interface ProcessEnv {
    // hard-coded Quasar env var:
    NODE_ENV: string;
    VUE_ROUTER_MODE: "hash" | "history" | "abstract" | undefined;
    VUE_ROUTER_BASE: string | undefined;
    // custom env below must have the VITE_ prefix
    VITE_API_BASE_URL: string;
    VITE_BACK_DID: string;
    VITE_USE_DUMMY_ACCESS: "true" | "false";
    VITE_IS_ORG_IMPORT_ONLY: "true" | "false";
  }
}
