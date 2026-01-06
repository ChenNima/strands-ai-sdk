"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    // Generate a new UUID and redirect to /chat/[uuid]
    const newId = crypto.randomUUID();
    router.push(`/chat/${newId}`);
  }, [router]);

  return <div className="flex items-center justify-center h-screen">Redirecting...</div>;
}
