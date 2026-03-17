import axios from "axios";
import { processEnv } from "src/utils/processEnv";

// Create axios instances that can be imported
export const axiosInstance = axios;

// In development, use "/" so requests go through the Vite dev-server
// proxy (e.g. /api/… → http://localhost:8084/api/…).
// This avoids mixed-content (HTTPS page → HTTP API) and CORS issues.
// Must be "/" not "" because the generated API client in src/api/common.ts
// checks `axios.defaults.baseURL` truthiness – empty string is falsy and
// triggers a fallback to BASE_PATH ("http://localhost").
// In production, use the real API URL since there's no Vite proxy.
const apiBaseUrl = process.env.DEV ? "/" : processEnv.VITE_API_BASE_URL;
export const api = axios.create({ baseURL: apiBaseUrl });

// Add request interceptor to include Accept-Language header
api.interceptors.request.use(
  (config) => {
    // Get display language from localStorage (same key used by useLanguageStore)
    const displayLanguage = localStorage.getItem("displayLanguage");

    if (displayLanguage) {
      config.headers["Accept-Language"] = displayLanguage;
    }

    // Ensure POST requests always have Content-Type set.
    // The generated API client omits Content-Type for bodyless POST endpoints,
    // which causes Fastify v5 to return 415 Unsupported Media Type.
    if (config.method === "post" && !config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  function (error: unknown) {
    // Do something with request error
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);
