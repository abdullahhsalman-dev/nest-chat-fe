"use client";

import { useEffect } from "react";
import { useChatStore } from "../stores/useChatStore";
import { useAuthStore } from "../stores/useAuthStore";

// This component is used to initialize client-side state
// that needs to persist across route navigations
export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const { connectSocket, disconnectSocket } = useChatStore();
  const { isAuthenticated } = useAuthStore();

  // Setup web socket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, connectSocket, disconnectSocket]);

  // Protect certain routes
  useEffect(() => {
    if (isAuthenticated) {
      // If already logged in and on login/register page, redirect to chat
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path === "/login" || path === "/register") {
          window.location.href = "/chat";
        }
      }
    }
  }, [isAuthenticated]);

  return <>{children}</>;
}
