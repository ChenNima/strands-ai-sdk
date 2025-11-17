"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatInterface } from "@/components/custom/chat-interface";

export default function Page() {
  const params = useParams();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = params?.uuid as string;
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConversationId(id);
      setIsLoading(false);
    }
  }, [params]);

  if (isLoading || !conversationId) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return <ChatInterface conversationId={conversationId} />;
}
