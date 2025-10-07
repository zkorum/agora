import axios from "axios";

// Create axios instances that can be imported
export const axiosInstance = axios;
export const api = axios.create({ baseURL: process.env.VITE_API_BASE_URL });
