"use client";

import { useEffect } from "react";
import { redirect } from "next/navigation";
import { useAuthStore, initializeAuth } from "../stores/useAuthStore";
import ChatComponent from "../components/ChatComponent";

export default function ChatPage() {
  const { isAuthenticated, loading } = useAuthStore();

  useEffect(() => {
    initializeAuth().catch(console.error);
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      redirect("/login");
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return isAuthenticated ? <ChatComponent /> : null;
}
