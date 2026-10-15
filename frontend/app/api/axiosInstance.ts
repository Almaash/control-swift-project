import axios from "axios";
import BASE_URL from "./BaseUrl";

const clearAuthState = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
};

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Attach JWT token to requests.
axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers ?? {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return config;
});

// Handle unauthorized responses.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 401 &&
      typeof window !== "undefined"
    ) {
      const requestUrl = String(error.config?.url ?? "");

      // Do not redirect when login or registration fails.
      const isAuthRequest =
        /(^|\/)auth\/(login|register)(\/|$)/i.test(requestUrl) ||
        /(^|\/)(login|register)(\/|$)/i.test(requestUrl);

      if (!isAuthRequest) {
        clearAuthState();

        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;