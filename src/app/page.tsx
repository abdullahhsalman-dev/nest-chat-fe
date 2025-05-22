"use client";

import { useEffect } from "react";
import {
  useAuthStore,
  initializeAuth,
  setupAxiosInterceptors,
} from "./stores/useAuthStore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const { isAuthenticated, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initializeAuth().catch(console.error);
    setupAxiosInterceptors();
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/chat");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome to the Real-time Chat App
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A modern, secure messaging platform built with Next.js and NestJS
          microservices
        </p>
      </div>

      <div className="flex gap-4 animate-slide-in">
        <Link
          href="/login"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
        >
          Register
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        <FeatureCard
          title="Real-time Messaging"
          description="Instantly connect with friends and colleagues with our lightning-fast messaging system"
          icon="💬"
        />
        <FeatureCard
          title="Secure & Private"
          description="End-to-end encryption and JWT authentication ensure your conversations stay private"
          icon="🔒"
        />
        <FeatureCard
          title="Modern Interface"
          description="Enjoy a clean, intuitive UI that makes chatting a pleasure on any device"
          icon="✨"
        />
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
