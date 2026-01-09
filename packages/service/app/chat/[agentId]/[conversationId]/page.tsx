'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChatInterface } from '@/components/chat';
import { LoadingScreen } from '@/components/loading-screen';

export default function Page() {
  const params = useParams();
  const t = useTranslations();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const agent = params?.agentId as string;
    const conversation = params?.conversationId as string;
    if (agent && conversation) {
      setAgentId(agent);
      setConversationId(conversation);
      setIsLoading(false);
    }
  }, [params]);

  if (isLoading || !agentId || !conversationId) {
    return <LoadingScreen message={t('common.loading')} />;
  }

  return <ChatInterface agentId={agentId} conversationId={conversationId} />;
}
