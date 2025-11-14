import axios from "axios";
import { processEnv } from "src/utils/processEnv";

// Create axios instances that can be imported
export const axiosInstance = axios;
export const api = axios.create({ baseURL: processEnv.VITE_API_BASE_URL });

// Add request interceptor to include Accept-Language header
api.interceptors.request.use(
  (config) => {
    // Get display language from localStorage (same key used by useLanguageStore)
    const displayLanguage = localStorage.getItem("displayLanguage");

    if (displayLanguage) {
      config.headers["Accept-Language"] = displayLanguage;
    }

    return config;
  },
  function (error: unknown) {
    // Do something with request error
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);
