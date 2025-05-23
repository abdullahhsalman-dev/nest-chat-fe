"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAuthStore,
  initializeAuth,
  setupAxiosInterceptors,
} from "../stores/useAuthStore";
import ChatComponent from "../components/ChatComponent";

export default function ChatPage() {
  const { isAuthenticated, loading } = useAuthStore();
  const router = useRouter();
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        setupAxiosInterceptors(); // Ensure interceptors are set up
        await initializeAuth();
        console.log(
          "Auth state after initialization:",
          useAuthStore.getState()
        );
      } catch (error) {
        console.error("Failed to initialize auth:", error);
      } finally {
        setInitialCheckComplete(true); // Mark initial check as complete
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (initialCheckComplete && !loading && !isAuthenticated) {
      console.log("Not authenticated, navigating to /login", {
        isAuthenticated,
        loading,
      });
      router.push("/login"); // Redirect only once after initial check
    }
  }, [initialCheckComplete, isAuthenticated, loading, router]);

  if (loading && !initialCheckComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Prevent rendering during redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <ChatComponent />
    </div>
  );
}
