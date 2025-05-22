import axios, { AxiosError } from "axios";
import { create } from "zustand";
import { ApiErrorResponse } from "./useChatStore";

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<User>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

// Set the API base URL for auth endpoints
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Configure axios to always send cookies with requests
axios.defaults.withCredentials = true;
axios.defaults.timeout = 10000;

const handleAuthError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (axiosError.response) {
      // Server responded with error status
      return axiosError.response.data?.message || axiosError.message;
    } else if (axiosError.request) {
      // Request was made but no response received
      return "Network error - please check your connection";
    } else {
      // Something else happened
      return axiosError.message;
    }
  } else if (error instanceof Error) {
    return error.message;
  } else {
    return "An unknown error occurred";
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email,
          password,
        },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Login response:", response.data);

      const { user } = response.data;
      // Note: No need to handle token manually - it's in HTTP-only cookie

      set({
        user,
        isAuthenticated: true,
        loading: false,
      });

      return user;
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = handleAuthError(error);

      set({
        error: errorMessage,
        loading: false,
        isAuthenticated: false,
        user: null,
      });

      throw new Error(errorMessage);
    }
  },

  register: async (username: string, email: string, password: string) => {
    try {
      set({ loading: true, error: null });

      await axios.post(
        `${API_URL}/auth/register`,
        {
          username,
          email,
          password,
        },
        {
          withCredentials: true,
        }
      );

      set({ loading: false });
    } catch (error) {
      console.error("Register error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Failed to register";

      set({
        error: errorMessage,
        loading: false,
      });

      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    try {
      // Call logout endpoint to clear the HTTP-only cookie
      await axios.post(
        `${API_URL}/auth/logout`,
        {},
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with local logout even if server request fails
    } finally {
      // Clear local state
      set({
        user: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  checkAuth: async () => {
    try {
      set({ loading: true });

      const response = await axios.get(`${API_URL}/auth/user/me`, {
        withCredentials: true,
      });

      console.log("Auth check response:", response.data);

      const { user } = response.data;

      set({
        user,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      console.error("Auth check error:", error);

      // If auth check fails, user is not authenticated
      set({
        user: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Initialize auth state by checking if user is authenticated via cookie
export const initializeAuth = async (): Promise<void> => {
  const { checkAuth } = useAuthStore.getState();

  try {
    await checkAuth();
    console.log("Auth initialized successfully:", useAuthStore.getState()); // Debug log
  } catch (error) {
    console.error("Failed to initialize auth:", error);
    // Set loading to false even if initialization fails
    useAuthStore.setState({ loading: false });
  }
};

// Export a function to configure axios interceptors (optional but recommended)
export const setupAxiosInterceptors = () => {
  // Request interceptor to ensure credentials are always sent
  axios.interceptors.request.use(
    (config) => {
      config.withCredentials = true;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle authentication errors
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // If we get a 401 (Unauthorized), the cookie might be expired/invalid
      if (error.response?.status === 401) {
        const { logout } = useAuthStore.getState();
        logout();
      }
      return Promise.reject(error);
    }
  );
};

// Call this in your app initialization (e.g., in _app.tsx or main.tsx)
// setupAxiosInterceptors();
