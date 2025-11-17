"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Loader } from "@/components/ai-elements/loader";

export default function Page() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // If authenticated, redirect to chat
        router.push('/chat');
      } else {
        // If not authenticated, redirect to login
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader size={40} />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
