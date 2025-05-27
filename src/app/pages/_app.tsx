import { useEffect } from "react";
import { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useAuthStore, initializeAuth } from "../stores/useAuthStore";
import { useChatStore } from "../stores/useChatStore";
import "../styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuthStore();
  const { connectSocket, disconnectSocket } = useChatStore();

  // Initialize auth state on app load
  useEffect(() => {
    initializeAuth().catch(console.error);
  }, []);

  // Connect to socket when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();

      // Public routes that don't need redirection
      const publicRoutes = ["/login", "/register"];
      if (publicRoutes.includes(router.pathname)) {
        router.push("/");
      }
    } else if (!authLoading) {
      disconnectSocket();

      // Protected routes that need authentication
      const protectedRoutes = ["/", "/chat", "/profile"];
      if (protectedRoutes.includes(router.pathname)) {
        router.push("/login");
      }
    }

    // Disconnect socket when component unmounts
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, authLoading, router, connectSocket, disconnectSocket]);

  return <Component {...pageProps} />;
}

export default MyApp;
