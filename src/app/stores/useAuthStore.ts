import axios from "axios";
import { create } from "zustand";

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<User>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// Set the API base URL for auth endpoints
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  isAuthenticated:
    typeof window !== "undefined" ? !!localStorage.getItem("token") : false,
  loading: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.post<{ token: string; user: User }>(
        `${API_URL}/auth/login`,
        {
          email,
          password,
        }
      );

      const { token, user } = response.data;

      localStorage.setItem("userId", user.id);
      // Set token in localStorage and axios default headers
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      set({
        user,
        token,
        isAuthenticated: true,
        loading: false,
      });

      return user;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to login";

      set({
        error: errorMessage,
        loading: false,
      });

      throw new Error(errorMessage);
    }
  },

  register: async (username: string, email: string, password: string) => {
    try {
      set({ loading: true, error: null });

      await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password,
      });

      set({ loading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to register";

      set({
        error: errorMessage,
        loading: false,
      });

      throw new Error(errorMessage);
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Initialize auth state by checking token and getting user profile
export const initializeAuth = async (): Promise<void> => {
  const { token, isAuthenticated, logout } = useAuthStore.getState();

  if (token && isAuthenticated) {
    try {
      useAuthStore.setState({ loading: true });
      const userId = localStorage.getItem("userId");

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const response = await axios.get<User>(`${API_URL}/auth/user/${userId}`);

      useAuthStore.setState({
        user: response.data,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      // If token is invalid, log the user out
      console.log("error is ", error);
      logout();
    } finally {
      useAuthStore.setState({ loading: false });
    }
  } else {
    useAuthStore.setState({ loading: false });
  }
};
