import axios from "axios";

export const TOKEN_KEY = "dc_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // An expired/invalid session anywhere should log the user out everywhere.
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event("dc:unauthorized"));
    }
    return Promise.reject(error);
  }
);

/** Human-readable message from any axios error. */
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === "ECONNABORTED") return "The request timed out. Please try again.";
  if (error.request && !error.response) return "Cannot reach the server. Check your connection.";
  return fallback;
}

/** Unwraps the `{ success, data }` envelope. */
export const unwrap = (res) => res.data.data;

export default api;
